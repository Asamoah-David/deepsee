using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;

namespace DeepSee.Agent.Core;

public class WorkerLauncher
{
    private readonly ILogger<WorkerLauncher> _logger;
    private Process? _workerProcess;

    [DllImport("kernel32.dll")]
    private static extern uint WTSGetActiveConsoleSessionId();

    [DllImport("wtsapi32.dll", SetLastError = true)]
    private static extern bool WTSQueryUserToken(uint sessionId, out IntPtr phToken);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    public WorkerLauncher(ILogger<WorkerLauncher> logger)
    {
        _logger = logger;
    }

    public void LaunchIfUserSessionActive()
    {
        try
        {
            var workerPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "DeepSee.Worker.exe");
            if (!File.Exists(workerPath))
            {
                // Also check ProgramData install path
                workerPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "DeepSee", "DeepSee.Worker.exe");
            }

            if (!File.Exists(workerPath))
            {
                _logger.LogInformation("DeepSee.Worker executable not located at {Path}; skipping worker spawn.", workerPath);
                return;
            }

            uint activeSessionId = WTSGetActiveConsoleSessionId();
            _logger.LogInformation("Active console session ID detected: {SessionId}", activeSessionId);

            if (_workerProcess != null && !_workerProcess.HasExited)
            {
                return;
            }

            // Launch worker process
            var startInfo = new ProcessStartInfo
            {
                FileName = workerPath,
                Arguments = $"--session {activeSessionId}",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            _workerProcess = Process.Start(startInfo);
            if (_workerProcess != null)
            {
                _logger.LogInformation("Spawned DeepSee.Worker (PID: {Pid})", _workerProcess.Id);
                _workerProcess.EnableRaisingEvents = true;
                _workerProcess.Exited += (s, e) =>
                {
                    _logger.LogWarning("DeepSee.Worker process exited.");
                    _workerProcess = null;
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to launch user-session worker process");
        }
    }
}
