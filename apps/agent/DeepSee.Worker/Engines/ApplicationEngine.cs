using System;
using System.Collections.Generic;
using System.Diagnostics;
using Microsoft.Win32;

namespace DeepSee.Worker.Engines;

public record AppItem(string Name, string Version, string Publisher, string InstallDate);
public record ProcessItem(int Pid, string Name, long WorkingSetMb, double CpuSeconds);

public class ApplicationEngine
{
    public List<AppItem> GetInstalledApplications()
    {
        var apps = new List<AppItem>();
        var registryKeys = new[]
        {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        };

        foreach (var keyPath in registryKeys)
        {
            using var key = Registry.LocalMachine.OpenSubKey(keyPath);
            if (key == null) continue;

            foreach (var subKeyName in key.GetSubKeyNames())
            {
                using var subKey = key.OpenSubKey(subKeyName);
                if (subKey == null) continue;

                var name = subKey.GetValue("DisplayName")?.ToString();
                if (string.IsNullOrEmpty(name)) continue;

                var version = subKey.GetValue("DisplayVersion")?.ToString() ?? "N/A";
                var publisher = subKey.GetValue("Publisher")?.ToString() ?? "Unknown";
                var date = subKey.GetValue("InstallDate")?.ToString() ?? string.Empty;

                apps.Add(new AppItem(name, version, publisher, date));
            }
        }

        return apps;
    }

    public List<ProcessItem> GetProcesses()
    {
        var list = new List<ProcessItem>();
        foreach (var proc in Process.GetProcesses())
        {
            try
            {
                list.Add(new ProcessItem(
                    proc.Id,
                    proc.ProcessName,
                    proc.WorkingSet64 / (1024 * 1024),
                    proc.TotalProcessorTime.TotalSeconds));
            }
            catch
            {
                // Access denied on system-level processes
            }
        }
        return list;
    }

    public bool TerminateProcess(int pid)
    {
        try
        {
            var proc = Process.GetProcessById(pid);
            proc.Kill(true);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
