using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using DeepSee.Agent.Config;
using DeepSee.Agent.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Websocket.Client;

namespace DeepSee.Agent.Core;

public class CommunicationEngine : IDisposable
{
    private readonly ILogger<CommunicationEngine> _logger;
    private readonly DeviceIdentity _identity;
    private readonly MonitoringEngine _monitoring;
    private readonly CommandEngine _commandEngine;
    private readonly HttpClient _httpClient;
    private WebsocketClient? _wsClient;
    private readonly SemaphoreSlim _relayLifecycle = new(1, 1);

    public CommunicationEngine(
        ILogger<CommunicationEngine> logger,
        DeviceIdentity identity,
        MonitoringEngine monitoring,
        CommandEngine commandEngine,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _identity = identity;
        _monitoring = monitoring;
        _commandEngine = commandEngine;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task ConnectAsync(CancellationToken ct)
    {
        // 1. Check if enrollment is required
        if (!_identity.IsEnrolled)
        {
            var enrolled = await TryEnrollAsync();
            if (!enrolled)
            {
                _logger.LogWarning("Agent is not yet enrolled. Awaiting administrator enrollment action.");
                return;
            }
        }

        // Rotate an older stored credential at startup before establishing relay
        // authorization, preserving enrollment while upgrading legacy tokens.
        await RotateCredentialAsync(force: true, reconnect: false);
        await ConnectRelayAsync(ct);
    }

    private async Task<bool> TryEnrollAsync()
    {
        var code = AgentConfig.EnrollmentCode;
        if (string.IsNullOrWhiteSpace(code))
        {
            _logger.LogInformation("No enrollment code specified in configuration.");
            return false;
        }

        try
        {
            _logger.LogInformation("Attempting automatic device enrollment.");
            var proofTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var proofNonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
            var hostname = Environment.MachineName;
            var proofSignature = _identity.SignEnrollmentProof(code, hostname, proofTimestamp, proofNonce);
            var req = new EnrollmentRequest(
                Code: code,
                DeviceId: _identity.DeviceId,
                PublicKey: _identity.PublicKey,
                HardwareFingerprint: _identity.GenerateHardwareFingerprint(),
                AgentVersion: AgentConfig.Version,
                Hostname: hostname,
                OsVersion: Environment.OSVersion.VersionString,
                ProofSignature: proofSignature,
                ProofTimestamp: proofTimestamp,
                ProofNonce: proofNonce
            );

            var resp = await _httpClient.PostAsJsonAsync($"{AgentConfig.ApiUrl}/api/enrollment/claim", req);
            if (resp.IsSuccessStatusCode)
            {
                var result = await resp.Content.ReadFromJsonAsync<EnrollmentResponse>();
                if (result?.Success == true && !string.IsNullOrEmpty(result.DeviceJwt) && !string.IsNullOrEmpty(result.OrgId))
                {
                    if (!string.Equals(result.DeviceId, _identity.DeviceId, StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogError("Enrollment response device identity did not match this agent.");
                        return false;
                    }

                    await _identity.SaveJwtAsync(result.DeviceJwt, result.OrgId, result.CredentialVersion);
                    _logger.LogInformation("Device successfully enrolled into organization: {OrgId}", result.OrgId);
                    return true;
                }
            }

            _logger.LogWarning("Enrollment claim request returned non-success: {StatusCode}", resp.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while attempting device enrollment");
        }

        return false;
    }

    private async Task HandleIncomingMessageAsync(string text)
    {
        try
        {
            var msg = JsonConvert.DeserializeObject<AgentMessage>(text);
            if (msg == null) return;

            var result = await _commandEngine.ExecuteAsync(msg);
            await SendAsync("command.result", result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse incoming relay message: {Text}", text);
        }
    }

    public async Task SendHeartbeatAsync()
    {
        if (!_identity.IsEnrolled)
            return;

        await RotateCredentialAsync(force: false);
        if (_wsClient == null || !_wsClient.IsRunning) return;

        var snapshot = _monitoring.GetCurrentSnapshot();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{AgentConfig.ApiUrl.TrimEnd('/')}/api/devices/heartbeat")
        {
            Content = JsonContent.Create(new
            {
                device_id = _identity.DeviceId,
                metrics = new
                {
                    cpu_percent = snapshot.CpuPercent,
                    ram_percent = snapshot.RamPercent,
                    disk_percent = snapshot.DiskPercent,
                    network_in_kbps = snapshot.NetworkInKbps,
                    network_out_kbps = snapshot.NetworkOutKbps,
                    uptime_seconds = snapshot.UptimeSeconds,
                    battery_percent = snapshot.BatteryPercent,
                    battery_charging = snapshot.BatteryCharging
                }
            })
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _identity.DeviceJwt);
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Heartbeat rejected by control plane: {StatusCode}", response.StatusCode);
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                await RotateCredentialAsync(force: true);
                return;
            }
            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                await _identity.ClearJwtAsync();
                await DisconnectRelayAsync();
                _logger.LogError("The control plane revoked this device credential; relay communication has stopped.");
                return;
            }
            response.EnsureSuccessStatusCode();
        }
    }

    public Task SendAsync(string messageType, object payload)
    {
        if (_wsClient == null || !_wsClient.IsRunning)
            return Task.CompletedTask;

        var envelope = new
        {
            id = Guid.NewGuid().ToString(),
            type = messageType,
            deviceId = _identity.DeviceId,
            orgId = _identity.OrgId,
            payload,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        var json = JsonConvert.SerializeObject(envelope);
        _wsClient.Send(json);
        return Task.CompletedTask;
    }

    private async Task RotateCredentialAsync(bool force, bool reconnect = true)
    {
        var currentToken = _identity.DeviceJwt;
        var expiresAt = _identity.TokenExpiresAt;
        if (string.IsNullOrWhiteSpace(currentToken) || (!force && expiresAt.HasValue && expiresAt.Value > DateTime.UtcNow.AddMinutes(10))) return;

        try
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
            var signature = _identity.SignRotationProof(timestamp, nonce);
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{AgentConfig.ApiUrl.TrimEnd('/')}/api/devices/credentials/rotate")
            {
                Content = JsonContent.Create(new { timestamp, nonce, signature })
            };
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", currentToken);
            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Credential rotation deferred: {StatusCode}", response.StatusCode);
                return;
            }
            var rotated = await response.Content.ReadFromJsonAsync<DeviceCredentialRotationResponse>();
            if (rotated == null || string.IsNullOrWhiteSpace(rotated.DeviceJwt) || rotated.CredentialVersion < 1)
                throw new InvalidOperationException("Credential rotation response was incomplete.");
            await _identity.SaveJwtAsync(rotated.DeviceJwt, _identity.OrgId!, rotated.CredentialVersion);
            _logger.LogInformation("Device credential rotated to version {CredentialVersion}.", rotated.CredentialVersion);
            if (reconnect) await ConnectRelayAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Device credential rotation failed; retrying on the next heartbeat.");
        }
    }

    private async Task ConnectRelayAsync(CancellationToken ct)
    {
        await _relayLifecycle.WaitAsync(ct);
        try
        {
            if (_wsClient != null)
            {
                var oldClient = _wsClient;
                _wsClient = null;
                oldClient.Dispose();
            }

            var relayBase = AgentConfig.RelayUrl.TrimEnd('/');
            var proofTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var proofNonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
            var proofSignature = _identity.SignRelayProof(proofTimestamp, proofNonce);
            var uri = new Uri($"{relayBase}?token={Uri.EscapeDataString(_identity.DeviceJwt!)}&deviceId={Uri.EscapeDataString(_identity.DeviceId)}&type=agent&proofTimestamp={proofTimestamp}&proofNonce={proofNonce}&proofSignature={Uri.EscapeDataString(proofSignature)}");
            var client = new WebsocketClient(uri)
            {
                ReconnectTimeout = TimeSpan.FromSeconds(30),
                ErrorReconnectTimeout = TimeSpan.FromSeconds(5)
            };
            _wsClient = client;
            client.MessageReceived.Subscribe(async msg =>
            {
                if (msg.Text != null) await HandleIncomingMessageAsync(msg.Text);
            });
            client.ReconnectionHappened.Subscribe(info => _logger.LogInformation("Relay connection established (type: {Type})", info.Type));
            client.DisconnectionHappened.Subscribe(info => _logger.LogWarning("Relay connection disconnected: {Desc}", info.CloseStatusDescription));
            await client.Start();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to relay server at {RelayUrl}", AgentConfig.RelayUrl);
        }
        finally { _relayLifecycle.Release(); }
    }

    private async Task DisconnectRelayAsync()
    {
        await _relayLifecycle.WaitAsync();
        try
        {
            var client = _wsClient;
            _wsClient = null;
            client?.Dispose();
        }
        finally { _relayLifecycle.Release(); }
    }

    public void Dispose()
    {
        _wsClient?.Dispose();
        _httpClient.Dispose();
    }
}

internal sealed record DeviceCredentialRotationResponse(string DeviceJwt, int CredentialVersion);
