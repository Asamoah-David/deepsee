using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using DeepSee.Worker.Engines;
using DeepSee.Worker.IPC;
using Serilog;

namespace DeepSee.Worker;

public static class Program
{
    private static readonly CancellationTokenSource Cts = new();

    public static async Task<int> Main(string[] args)
    {
        var logDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "DeepSee", "logs");
        Directory.CreateDirectory(logDir);

        Log.Logger = new LoggerConfiguration()
            .WriteTo.File(Path.Combine(logDir, "worker-.log"), rollingInterval: RollingInterval.Day)
            .WriteTo.Console()
            .MinimumLevel.Information()
            .CreateLogger();

        Log.Information("DeepSee Worker started in user session: {SessionId}", Environment.UserName);

        AppDomain.CurrentDomain.ProcessExit += (s, e) => Cts.Cancel();

        try
        {
            var screenEngine = new ScreenCaptureEngine();
            var inputEngine = new InputEngine();
            var fileEngine = new FileEngine();
            var appEngine = new ApplicationEngine();
            var diagEngine = new DiagnosticsEngine();

            var pipeClient = new PipeClient(screenEngine, inputEngine, fileEngine, appEngine, diagEngine);
            await pipeClient.StartAsync(Cts.Token);

            return 0;
        }
        catch (OperationCanceledException)
        {
            Log.Information("DeepSee Worker process shutting down.");
            return 0;
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "DeepSee Worker encountered an unexpected error.");
            return 1;
        }
        finally
        {
            await Log.CloseAndFlushAsync();
        }
    }
}
