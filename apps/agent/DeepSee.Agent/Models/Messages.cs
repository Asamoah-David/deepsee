using System;

namespace DeepSee.Agent.Models;

/// <summary>
/// Envelope for incoming and outgoing JSON control frames across the relay.
/// </summary>
public record AgentMessage(
    string Id,
    string Type,
    string DeviceId,
    string OrgId,
    object? Payload,
    long Timestamp,
    long ExpiresAt,
    string? Signature = null
);

/// <summary>
/// Realtime health metrics packet collected periodically.
/// </summary>
public record MetricsSnapshot(
    double CpuPercent,
    double RamPercent,
    double DiskPercent,
    double NetworkInKbps,
    double NetworkOutKbps,
    long UptimeSeconds,
    double? BatteryPercent,
    bool? BatteryCharging
);

/// <summary>
/// Heartbeat broadcast payload transmitted to the Command Center.
/// </summary>
public record HeartbeatPayload(
    string DeviceId,
    string OrgId,
    string AgentVersion,
    MetricsSnapshot Metrics,
    string Status,
    string Hostname
);

/// <summary>
/// Result status returned after authorized command execution.
/// </summary>
public record CommandResult(
    string CommandId,
    string DeviceId,
    string OrgId,
    string Status,
    object? Data,
    string? Error,
    DateTime CompletedAt
);

/// <summary>
/// Device enrollment initiation payload.
/// </summary>
public record EnrollmentRequest(
    string Code,
    string PublicKey,
    string HardwareFingerprint,
    string AgentVersion,
    string Hostname,
    string OsVersion
);

/// <summary>
/// Backend response after validating an enrollment code.
/// </summary>
public record EnrollmentResponse(
    bool Success,
    string? DeviceJwt,
    string? DeviceId,
    string? OrgId,
    string? Error
);
