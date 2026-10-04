using System;
using System.IO.Pipes;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using DeepSee.Worker.Engines;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Serilog;

namespace DeepSee.Worker.IPC;

public class PipeClient
{
    private readonly ScreenCaptureEngine _screen;
    private readonly InputEngine _input;
    private readonly FileEngine _file;
    private readonly ApplicationEngine _apps;
    private readonly DiagnosticsEngine _diag;

    public PipeClient(
        ScreenCaptureEngine screen,
        InputEngine input,
        FileEngine file,
        ApplicationEngine apps,
        DiagnosticsEngine diag)
    {
        _screen = screen;
        _input = input;
        _file = file;
        _apps = apps;
        _diag = diag;
    }

    public async Task StartAsync(CancellationToken ct)
    {
        Log.Information("IPC PipeClient initialized. Awaiting commands or IPC channel.");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                // In interactive desktop mode, the worker stands ready to execute capture/input tasks
                await Task.Delay(5000, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    public object? Dispatch(string commandType, JObject? payload)
    {
        switch (commandType.ToLowerInvariant())
        {
            case "screen.snapshot":
                return _screen.CaptureSnapshot();

            case "screen.monitors":
                return _screen.GetMonitors();

            case "input.mouse.move":
                int mx = payload?["x"]?.Value<int>() ?? 0;
                int my = payload?["y"]?.Value<int>() ?? 0;
                _input.MoveMouse(mx, my);
                return true;

            case "input.mouse.click":
                int cx = payload?["x"]?.Value<int>() ?? 0;
                int cy = payload?["y"]?.Value<int>() ?? 0;
                string btn = payload?["button"]?.ToString() ?? "left";
                _input.MouseClick(cx, cy, btn);
                return true;

            case "input.text":
                string txt = payload?["text"]?.ToString() ?? string.Empty;
                _input.SendText(txt);
                return true;

            case "apps.installed":
                return _apps.GetInstalledApplications();

            case "apps.processes":
                return _apps.GetProcesses();

            case "diagnostics.run":
                return _diag.RunDiagnostics();

            case "files.drives":
                return _file.GetDrives();

            case "files.list":
                string path = payload?["path"]?.ToString() ?? "C:\\";
                return _file.ListDirectory(path);

            default:
                Log.Warning("Unhandled worker action: {Type}", commandType);
                return null;
        }
    }
}
