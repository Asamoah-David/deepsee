using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

namespace DeepSee.Agent.Core;

public class PolicyEngine
{
    private readonly ILogger<PolicyEngine> _logger;
    private readonly ConcurrentDictionary<string, bool> _featureFlags = new(StringComparer.OrdinalIgnoreCase);

    public PolicyEngine(ILogger<PolicyEngine> logger)
    {
        _logger = logger;
        // Default enterprise policy settings
        _featureFlags["screen_view"] = true;
        _featureFlags["remote_control"] = true;
        _featureFlags["file_transfer"] = true;
        _featureFlags["terminal"] = true;
        _featureFlags["diagnostics"] = true;
        _featureFlags["process_management"] = true;
        _featureFlags["service_management"] = true;
    }

    public bool IsFeatureAllowed(string featureKey)
    {
        if (_featureFlags.TryGetValue(featureKey, out var allowed))
        {
            return allowed;
        }
        return true;
    }

    public void UpdatePolicies(Dictionary<string, bool> updatedFlags)
    {
        foreach (var (key, val) in updatedFlags)
        {
            _featureFlags[key] = val;
        }
        _logger.LogInformation("Applied remote policy update. Total policies tracked: {Count}", _featureFlags.Count);
    }
}
