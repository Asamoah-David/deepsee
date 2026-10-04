using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Management;
using System.Threading;
using System.Threading.Tasks;
using DeepSee.Agent.Models;
using Microsoft.Extensions.Logging;

namespace DeepSee.Agent.Core;

public class MonitoringEngine
{
    private readonly ILogger<MonitoringEngine> _logger;
    private PerformanceCounter? _cpuCounter;
    private PerformanceCounter? _netInCounter;
    private PerformanceCounter? _netOutCounter;
    private MetricsSnapshot? _latestSnapshot;

    public MonitoringEngine(ILogger<MonitoringEngine> logger)
    {
        _logger = logger;
        InitializeCounters();
    }

    private void InitializeCounters()
    {
        try
        {
            _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            _cpuCounter.NextValue(); // First read is typically 0
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize standard CPU performance counter");
        }

        try
        {
            var netCategory = new PerformanceCounterCategory("Network Interface");
            var instances = netCategory.GetInstanceNames();
            var primaryInstance = instances.FirstOrDefault(i => !i.Contains("Loopback", StringComparison.OrdinalIgnoreCase) && !i.Contains("isatap", StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrEmpty(primaryInstance))
            {
                _netInCounter = new PerformanceCounter("Network Interface", "Bytes Received/sec", primaryInstance);
                _netOutCounter = new PerformanceCounter("Network Interface", "Bytes Sent/sec", primaryInstance);
                _netInCounter.NextValue();
                _netOutCounter.NextValue();
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Network performance counters not available or restricted");
        }
    }

    public MetricsSnapshot CollectSnapshot()
    {
        double cpu = 0.0;
        try
        {
            cpu = _cpuCounter != null ? Math.Round(_cpuCounter.NextValue(), 2) : 0.0;
        }
        catch
        {
            // Fallback
        }

        double ramPercent = 0.0;
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem");
            foreach (var item in searcher.Get())
            {
                var total = Convert.ToDouble(item["TotalVisibleMemorySize"]);
                var free = Convert.ToDouble(item["FreePhysicalMemory"]);
                if (total > 0)
                {
                    ramPercent = Math.Round(((total - free) / total) * 100.0, 2);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogTrace(ex, "WMI RAM telemetry read failed");
        }

        double diskPercent = 0.0;
        try
        {
            var systemDrive = DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady && d.RootDirectory.FullName.StartsWith("C", StringComparison.OrdinalIgnoreCase));
            if (systemDrive != null && systemDrive.TotalSize > 0)
            {
                var used = systemDrive.TotalSize - systemDrive.AvailableFreeSpace;
                diskPercent = Math.Round(((double)used / systemDrive.TotalSize) * 100.0, 2);
            }
        }
        catch (Exception ex)
        {
            _logger.LogTrace(ex, "Drive space inspection failed");
        }

        double netInKbps = 0.0;
        double netOutKbps = 0.0;
        try
        {
            if (_netInCounter != null) netInKbps = Math.Round((_netInCounter.NextValue() * 8.0) / 1024.0, 2);
            if (_netOutCounter != null) netOutKbps = Math.Round((_netOutCounter.NextValue() * 8.0) / 1024.0, 2);
        }
        catch { }

        long uptimeSeconds = Environment.TickCount64 / 1000;

        _latestSnapshot = new MetricsSnapshot(
            CpuPercent: cpu,
            RamPercent: ramPercent,
            DiskPercent: diskPercent,
            NetworkInKbps: netInKbps,
            NetworkOutKbps: netOutKbps,
            UptimeSeconds: uptimeSeconds,
            BatteryPercent: null,
            BatteryCharging: null
        );

        return _latestSnapshot;
    }

    public MetricsSnapshot GetCurrentSnapshot()
    {
        return _latestSnapshot ?? CollectSnapshot();
    }

    public void Start(CancellationToken ct)
    {
        Task.Run(async () =>
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    CollectSnapshot();
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Periodic telemetry loop error");
                }
                await Task.Delay(TimeSpan.FromSeconds(30), ct);
            }
        }, ct);
    }
}
