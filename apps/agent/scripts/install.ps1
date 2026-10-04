<#
.SYNOPSIS
    DeepSee Windows Agent Installation & Enrollment Script
.DESCRIPTION
    Installs the DeepSee Agent as a persistent Windows Service and prepares user-session workers.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$EnrollmentCode = "",

    [Parameter(Mandatory=$false)]
    [string]$RelayUrl = "wss://relay.deepsee.app",

    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "https://app.deepsee.app"
)

$ErrorActionPreference = "Stop"
$DataPath = "$env:ProgramData\DeepSee"
$ServiceName = "DeepSeeAgent"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " DeepSee Universal Windows Agent Installer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This installer requires administrative elevation. Please run as Administrator."
    exit 1
}

# 2. Create data and logging directories
New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
New-Item -ItemType Directory -Force -Path "$DataPath\logs" | Out-Null

# 3. Write initial configuration
$config = @{
    RelayUrl = $RelayUrl
    ApiUrl = $ApiUrl
    EnrollmentCode = $EnrollmentCode
    HeartbeatIntervalSeconds = 15
    MetricIntervalSeconds = 30
} | ConvertTo-Json
$config | Out-File -FilePath "$DataPath\config.json" -Encoding utf8

Write-Host "Configuration saved to: $DataPath\config.json" -ForegroundColor Green

# 4. Copy binaries if present alongside installer
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path "$scriptDir\DeepSee.Agent.exe") {
    Copy-Item "$scriptDir\DeepSee.Agent.exe" -Destination "$DataPath\DeepSee.Agent.exe" -Force
}
if (Test-Path "$scriptDir\DeepSee.Worker.exe") {
    Copy-Item "$scriptDir\DeepSee.Worker.exe" -Destination "$DataPath\DeepSee.Worker.exe" -Force
}

# 5. Clean up existing service if re-installing
if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "Stopping and upgrading existing service..." -ForegroundColor Yellow
    Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
}

# 6. Register Windows Service
$binPath = "$DataPath\DeepSee.Agent.exe"
if (Test-Path $binPath) {
    New-Service -Name $ServiceName `
        -DisplayName "DeepSee Agent" `
        -Description "DeepSee Universal Windows Device Management and Remote Operations Agent" `
        -BinaryPathName $binPath `
        -StartupType Automatic

    # Configure auto-recovery
    $actions = "restart/5000/restart/30000/restart/60000"
    sc.exe failure $ServiceName reset= 86400 actions= $actions | Out-Null

    Start-Service $ServiceName
    Start-Sleep -Seconds 2

    $svc = Get-Service $ServiceName
    if ($svc.Status -eq "Running") {
        Write-Host "DeepSee Agent Service successfully registered and running." -ForegroundColor Green
    }
} else {
    Write-Host "Note: Binary DeepSee.Agent.exe not yet staged in $DataPath. Run 'dotnet publish' to deploy." -ForegroundColor Yellow
}

Write-Host "Installation completed successfully." -ForegroundColor Cyan
