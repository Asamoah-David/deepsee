using DeepSee.Agent.Config;
using Newtonsoft.Json;

namespace DeepSee.Agent.Config;

/// <summary>
/// Static configuration for the DeepSee Agent.
/// Reads from %ProgramData%\DeepSee\config.json, with environment variable overrides.
/// </summary>
public class AgentConfig
{
    public const string Version = "1.0.0";
    
    private static readonly string ConfigPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "DeepSee", "config.json");

    private static AgentConfigData? _data;

    private static AgentConfigData Data
    {
        get
        {
            if (_data != null) return _data;
            _data = Load();
            return _data;
        }
    }

    /// <summary>Relay WebSocket URL (e.g., wss://relay.deepsee.app)</summary>
    public static string RelayUrl =>
        Environment.GetEnvironmentVariable("DEEPSEE_RELAY_URL")
        ?? Data.RelayUrl
        ?? "wss://relay.deepsee.app";

    /// <summary>Backend API URL</summary>
    public static string ApiUrl =>
        Environment.GetEnvironmentVariable("DEEPSEE_API_URL")
        ?? Data.ApiUrl
        ?? "https://app.deepsee.app";

    /// <summary>Enrollment code (set during installation)</summary>
    public static string? EnrollmentCode =>
        Environment.GetEnvironmentVariable("DEEPSEE_ENROLLMENT_CODE")
        ?? Data.EnrollmentCode;

    /// <summary>Heartbeat interval in seconds (default: 15)</summary>
    public static int HeartbeatIntervalSeconds =>
        int.TryParse(Environment.GetEnvironmentVariable("DEEPSEE_HEARTBEAT_INTERVAL"), out var v)
            ? v
            : Data.HeartbeatIntervalSeconds ?? 15;

    /// <summary>Metric collection interval in seconds (default: 30)</summary>
    public static int MetricIntervalSeconds =>
        int.TryParse(Environment.GetEnvironmentVariable("DEEPSEE_METRIC_INTERVAL"), out var v)
            ? v
            : Data.MetricIntervalSeconds ?? 30;

    private static AgentConfigData Load()
    {
        try
        {
            if (File.Exists(ConfigPath))
            {
                var json = File.ReadAllText(ConfigPath);
                return JsonConvert.DeserializeObject<AgentConfigData>(json) ?? new AgentConfigData();
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AgentConfig] Failed to load config: {ex.Message}");
        }
        return new AgentConfigData();
    }

    public static void Save(AgentConfigData data)
    {
        try
        {
            var dir = Path.GetDirectoryName(ConfigPath)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(ConfigPath, JsonConvert.SerializeObject(data, Formatting.Indented));
            _data = data;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AgentConfig] Failed to save config: {ex.Message}");
        }
    }
}

public class AgentConfigData
{
    public string? RelayUrl { get; set; }
    public string? ApiUrl { get; set; }
    public string? EnrollmentCode { get; set; }
    public int? HeartbeatIntervalSeconds { get; set; }
    public int? MetricIntervalSeconds { get; set; }
    public Dictionary<string, bool> FeatureFlags { get; set; } = new();
}
