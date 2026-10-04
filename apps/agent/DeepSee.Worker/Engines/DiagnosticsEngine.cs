using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;

namespace DeepSee.Worker.Engines;

public record DiagnosticsResult(
    string Hostname,
    string OsVersion,
    bool InternetReachable,
    List<DriveItem> Drives,
    List<string> Warnings,
    string HealthStatus
);

public class DiagnosticsEngine
{
    public DiagnosticsResult RunDiagnostics()
    {
        var warnings = new List<string>();

        // 1. Internet Reachability Test
        bool pingSuccess = false;
        try
        {
            using var ping = new Ping();
            var reply = ping.Send("1.1.1.1", 2000);
            pingSuccess = reply.Status == IPStatus.Success;
        }
        catch
        {
            warnings.Add("External network ping test failed or was blocked by firewall.");
        }

        // 2. Drive checks
        var drives = new List<DriveItem>();
        foreach (var d in DriveInfo.GetDrives().Where(d => d.IsReady))
        {
            drives.Add(new DriveItem(d.Name, d.VolumeLabel, d.TotalSize, d.AvailableFreeSpace));
            double freePercent = ((double)d.AvailableFreeSpace / d.TotalSize) * 100.0;
            if (freePercent < 10.0)
            {
                warnings.Add($"Drive {d.Name} storage is critically low ({Math.Round(freePercent, 1)}% free).");
            }
        }

        string overallHealth = warnings.Count > 0 ? "warning" : "healthy";

        return new DiagnosticsResult(
            Hostname: Environment.MachineName,
            OsVersion: Environment.OSVersion.ToString(),
            InternetReachable: pingSuccess,
            Drives: drives,
            Warnings: warnings,
            HealthStatus: overallHealth
        );
    }
}
