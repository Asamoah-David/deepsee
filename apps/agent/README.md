# DeepSee Windows Agent

The native Windows execution layer for the DeepSee platform.

## Architecture

The agent uses a **Split-Process Architecture** to safely manage Session 0 isolation on Windows 10 & 11:

```
┌────────────────────────────────────────────────────────┐
│ DeepSee.Agent (Windows Service - Session 0)           │
│  - Runs as SYSTEM                                      │
│  - Cryptographic RSA-2048 identity (DPAPI encrypted)   │
│  - WSS Relay communication & auto-reconnection         │
│  - System telemetry (CPU, RAM, Disk, Network)          │
│  - Replay-protected command validation & execution     │
│  - Monitors and launches worker process in Session 1+  │
└───────────────────────────┬────────────────────────────┘
                            │ Named Pipe / IPC
┌───────────────────────────▼────────────────────────────┐
│ DeepSee.Worker (User-Session Process - Session 1+)     │
│  - Runs under interactive desktop user context         │
│  - DXGI / GDI screen capture & JPEG streaming loop     │
│  - SendInput mouse & keyboard simulation               │
│  - Chunked file operations & directory inspection      │
│  - Process & registry-based application inventory      │
│  - Diagnostics evaluation                              │
└────────────────────────────────────────────────────────┘
```

## Building

Requires .NET 8.0 SDK with Windows Desktop workload.

```powershell
./scripts/build.ps1 -Configuration Release
```

## Installing & Enrolling

Run in an administrative PowerShell prompt:

```powershell
./scripts/install.ps1 -EnrollmentCode "YOUR-ENROLLMENT-CODE" -RelayUrl "wss://your-relay.railway.app" -ApiUrl "https://your-dashboard.railway.app"
```
