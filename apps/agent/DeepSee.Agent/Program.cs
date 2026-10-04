using DeepSee.Agent.Core;
using DeepSee.Agent.Config;
using Serilog;

// Configure Serilog early
var dataPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
    "DeepSee");
Directory.CreateDirectory(Path.Combine(dataPath, "logs"));

Log.Logger = new LoggerConfiguration()
    .WriteTo.File(
        Path.Combine(dataPath, "logs", "agent-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .MinimumLevel.Information()
    .CreateLogger();

try
{
    Log.Information("DeepSee Agent v{Version} starting", AgentConfig.Version);

    var builder = Host.CreateApplicationBuilder(args);
    builder.Services.AddWindowsService(options => options.ServiceName = "DeepSee Agent");
    builder.Logging.ClearProviders();
    builder.Logging.AddSerilog();

    // Core services
    builder.Services.AddSingleton<AgentConfig>();
    builder.Services.AddSingleton<DeviceIdentity>();
    builder.Services.AddSingleton<MonitoringEngine>();
    builder.Services.AddSingleton<CommandEngine>();
    builder.Services.AddSingleton<WorkerLauncher>();
    builder.Services.AddSingleton<PolicyEngine>();
    builder.Services.AddSingleton<CommunicationEngine>();
    builder.Services.AddHostedService<CoreService>();
    builder.Services.AddHttpClient();

    var host = builder.Build();
    await host.RunAsync();
    return 0;
}
catch (Exception ex)
{
    Log.Fatal(ex, "DeepSee Agent terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}
