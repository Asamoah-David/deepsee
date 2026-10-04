using System;
using System.Threading;
using System.Threading.Tasks;
using DeepSee.Agent.Config;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DeepSee.Agent.Core;

public class CoreService : BackgroundService
{
    private readonly ILogger<CoreService> _logger;
    private readonly DeviceIdentity _identity;
    private readonly CommunicationEngine _communication;
    private readonly MonitoringEngine _monitoring;
    private readonly WorkerLauncher _workerLauncher;

    public CoreService(
        ILogger<CoreService> logger,
        DeviceIdentity identity,
        CommunicationEngine communication,
        MonitoringEngine monitoring,
        WorkerLauncher workerLauncher)
    {
        _logger = logger;
        _identity = identity;
        _communication = communication;
        _monitoring = monitoring;
        _workerLauncher = workerLauncher;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DeepSee Core Service starting on host {MachineName}", Environment.MachineName);

        try
        {
            // 1. Initialize local DPAPI-protected identity
            await _identity.InitializeAsync();

            // 2. Start performance telemetry engine
            _monitoring.Start(stoppingToken);

            // 3. Connect to the WebSocket Relay / Cloud Control Plane
            await _communication.ConnectAsync(stoppingToken);

            // 4. Attempt to spawn user-session worker (for interactive desktop capture & input)
            _workerLauncher.LaunchIfUserSessionActive();

            _logger.LogInformation("DeepSee Agent initialized successfully. Ready for management.");

            // 5. Periodic Heartbeat Loop
            var interval = TimeSpan.FromSeconds(AgentConfig.HeartbeatIntervalSeconds);
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(interval, stoppingToken);

                try
                {
                    await _communication.SendHeartbeatAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to dispatch device heartbeat");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("DeepSee Agent is shutting down gracefully.");
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Fatal error in DeepSee CoreService lifecycle");
            throw;
        }
    }
}
