using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
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

        // 2. Connect to Relay
        try
        {
            var relayBase = AgentConfig.RelayUrl.TrimEnd('/');
            var uri = new Uri($"{relayBase}?token={_identity.DeviceJwt}&deviceId={_identity.DeviceId}&type=agent");

            _wsClient = new WebsocketClient(uri)
            {
                ReconnectTimeout = TimeSpan.FromSeconds(30),
                ErrorReconnectTimeout = TimeSpan.FromSeconds(5)
            };

            _wsClient.MessageReceived.Subscribe(async msg =>
            {
                if (msg.Text != null)
                {
                    await HandleIncomingMessageAsync(msg.Text);
                }
            });

            _wsClient.ReconnectionHappened.Subscribe(info =>
            {
                _logger.LogInformation("Relay connection established (type: {Type})", info.Type);
            });

            _wsClient.DisconnectionHappened.Subscribe(info =>
            {
                _logger.LogWarning("Relay connection disconnected: {Desc}", info.CloseStatusDescription);
            });

            await _wsClient.Start();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to relay server at {RelayUrl}", AgentConfig.RelayUrl);
        }
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
            _logger.LogInformation("Attempting automatic enrollment with code: {Code}", code);
            var req = new EnrollmentRequest(
                Code: code,
                PublicKey: _identity.PublicKey,
                HardwareFingerprint: _identity.GenerateHardwareFingerprint(),
                AgentVersion: AgentConfig.Version,
                Hostname: Environment.MachineName,
                OsVersion: Environment.OSVersion.VersionString
            );

            var resp = await _httpClient.PostAsJsonAsync($"{AgentConfig.ApiUrl}/api/enrollment/claim", req);
            if (resp.IsSuccessStatusCode)
            {
                var result = await resp.Content.ReadFromJsonAsync<EnrollmentResponse>();
                if (result?.Success == true && !string.IsNullOrEmpty(result.DeviceJwt) && !string.IsNullOrEmpty(result.OrgId))
                {
                    await _identity.SaveJwtAsync(result.DeviceJwt, result.OrgId);
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
        if (_wsClient == null || !_wsClient.IsRunning || !_identity.IsEnrolled)
            return;

        var snapshot = _monitoring.GetCurrentSnapshot();
        var payload = new HeartbeatPayload(
            DeviceId: _identity.DeviceId,
            OrgId: _identity.OrgId ?? string.Empty,
            AgentVersion: AgentConfig.Version,
            Metrics: snapshot,
            Status: "online",
            Hostname: Environment.MachineName
        );

        await SendAsync("device.heartbeat", payload);
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

    public void Dispose()
    {
        _wsClient?.Dispose();
        _httpClient.Dispose();
    }
}
