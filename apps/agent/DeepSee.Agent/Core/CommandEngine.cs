using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.ServiceProcess;
using System.Threading.Tasks;
using DeepSee.Agent.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace DeepSee.Agent.Core;

public class CommandEngine
{
    private readonly ILogger<CommandEngine> _logger;
    private readonly MonitoringEngine _monitoring;
    private readonly PolicyEngine _policy;
    private readonly ConcurrentDictionary<string, DateTime> _processedCommands = new();

    public CommandEngine(
        ILogger<CommandEngine> logger,
        MonitoringEngine monitoring,
        PolicyEngine policy)
    {
        _logger = logger;
        _monitoring = monitoring;
        _policy = policy;
    }

    public async Task<CommandResult> ExecuteAsync(AgentMessage msg)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (msg.ExpiresAt > 0 && msg.ExpiresAt < now)
        {
            return new CommandResult(msg.Id, msg.DeviceId, msg.OrgId, "timeout", null, "Command expired prior to receipt.", DateTime.UtcNow);
        }

        if (!_processedCommands.TryAdd(msg.Id, DateTime.UtcNow))
        {
            return new CommandResult(msg.Id, msg.DeviceId, msg.OrgId, "failed", null, "Duplicate command rejected (replay protection).", DateTime.UtcNow);
        }

        CleanupHistory();

        _logger.LogInformation("Processing command {CommandId} of type {Type}", msg.Id, msg.Type);

        try
        {
            switch (msg.Type.ToLowerInvariant())
            {
                case "monitoring.snapshot":
                    var snapshot = _monitoring.CollectSnapshot();
                    return new CommandResult(msg.Id, msg.DeviceId, msg.OrgId, "success", snapshot, null, DateTime.UtcNow);

                case "system.lock":
                    if (!_policy.IsFeatureAllowed("system_control"))
                        return Denied(msg, "System control policy disabled.");
                    Process.Start(new ProcessStartInfo("rundll32.exe", "user32.dll,LockWorkStation") { UseShellExecute = true });
                    return Success(msg, "Workstation locked successfully.");

                case "system.restart":
                    if (!_policy.IsFeatureAllowed("system_control"))
                        return Denied(msg, "System control policy disabled.");
                    Process.Start("shutdown.exe", "/r /t 5 /c \"Restart initiated from DeepSee Command Center\"");
                    return Success(msg, "Restart sequence initiated.");

                case "system.shutdown":
                    if (!_policy.IsFeatureAllowed("system_control"))
                        return Denied(msg, "System control policy disabled.");
                    Process.Start("shutdown.exe", "/s /t 10 /c \"Shutdown initiated from DeepSee Command Center\"");
                    return Success(msg, "Shutdown sequence initiated.");

                case "service.restart":
                case "service.start":
                case "service.stop":
                    return HandleServiceCommand(msg);

                case "diagnostics.run":
                    var diag = new
                    {
                        MachineName = Environment.MachineName,
                        OS = Environment.OSVersion.ToString(),
                        ProcessorCount = Environment.ProcessorCount,
                        MemorySnapshot = _monitoring.CollectSnapshot(),
                        ReportedAt = DateTime.UtcNow
                    };
                    return Success(msg, diag);

                default:
                    _logger.LogWarning("Unknown or unhandled command type: {Type}", msg.Type);
                    return new CommandResult(msg.Id, msg.DeviceId, msg.OrgId, "failed", null, $"Unsupported command type: {msg.Type}", DateTime.UtcNow);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Execution error on command {CommandId}", msg.Id);
            return new CommandResult(msg.Id, msg.DeviceId, msg.OrgId, "failed", null, ex.Message, DateTime.UtcNow);
        }
    }

    private CommandResult HandleServiceCommand(AgentMessage msg)
    {
        if (!_policy.IsFeatureAllowed("service_management"))
            return Denied(msg, "Service management policy disabled.");

        var payload = msg.Payload as JObject;
        var serviceName = payload?["serviceName"]?.ToString();
        if (string.IsNullOrEmpty(serviceName))
            return new CommandResult(msg.Id, msg.DeviceId, msg.OrgId, "failed", null, "Service name not supplied", DateTime.UtcNow);

        using var sc = new ServiceController(serviceName);
        if (msg.Type.Equals("service.stop", StringComparison.OrdinalIgnoreCase))
        {
            if (sc.CanStop)
            {
                sc.Stop();
                sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(15));
            }
            return Success(msg, $"Service {serviceName} stopped.");
        }
        else if (msg.Type.Equals("service.start", StringComparison.OrdinalIgnoreCase))
        {
            sc.Start();
            sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(15));
            return Success(msg, $"Service {serviceName} started.");
        }
        else
        {
            if (sc.CanStop)
            {
                sc.Stop();
                sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(15));
            }
            sc.Start();
            sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(15));
            return Success(msg, $"Service {serviceName} restarted.");
        }
    }

    private static CommandResult Success(AgentMessage msg, object? data) =>
        new(msg.Id, msg.DeviceId, msg.OrgId, "success", data, null, DateTime.UtcNow);

    private static CommandResult Denied(AgentMessage msg, string reason) =>
        new(msg.Id, msg.DeviceId, msg.OrgId, "permission_denied", null, reason, DateTime.UtcNow);

    private void CleanupHistory()
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-30);
        foreach (var (k, v) in _processedCommands)
        {
            if (v < cutoff) _processedCommands.TryRemove(k, out _);
        }
    }
}
