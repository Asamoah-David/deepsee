<#
.SYNOPSIS
    DeepSee Windows Agent Clean Removal Script
#>

[CmdletBinding()]
param()

$ServiceName = "DeepSeeAgent"
$DataPath = "$env:ProgramData\DeepSee"

Write-Host "Stopping and removing DeepSee Agent..." -ForegroundColor Yellow

if (Get-Service $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
}

if (Test-Path $DataPath) {
    Remove-Item $DataPath -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "DeepSee Agent has been completely removed." -ForegroundColor Green
