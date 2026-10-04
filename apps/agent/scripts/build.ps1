<#
.SYNOPSIS
    Compiles DeepSee Windows Agent and Worker into standalone executables.
#>

param(
    [string]$Configuration = "Release",
    [string]$OutputDir = "$PSScriptRoot\..\publish"
)

$ErrorActionPreference = "Stop"

Write-Host "Building DeepSee Agent & Worker ($Configuration)..." -ForegroundColor Cyan

$agentProj = "$PSScriptRoot\..\DeepSee.Agent\DeepSee.Agent.csproj"
$workerProj = "$PSScriptRoot\..\DeepSee.Worker\DeepSee.Worker.csproj"

dotnet publish $agentProj -c $Configuration -r win-x64 --self-contained -o "$OutputDir" /p:PublishSingleFile=true
dotnet publish $workerProj -c $Configuration -r win-x64 --self-contained -o "$OutputDir" /p:PublishSingleFile=true

Write-Host "Build complete! Standalone binaries deployed to: $OutputDir" -ForegroundColor Green
