# Orgaversum Starter Script
# Doppelklick auf diese Datei oder führe sie mit PowerShell aus

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Starte Orgaversum Server...           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Navigiere zum Script-Verzeichnis
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Prüfe ob node_modules existiert
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installiere Dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✓ Installation abgeschlossen!" -ForegroundColor Green
    Write-Host ""
}

# Starte den Server
Write-Host "🚀 Starte Server..." -ForegroundColor Green
Write-Host "📍 Browser öffnet sich automatisch unter: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Zum Beenden drücke STRG+C" -ForegroundColor Yellow
Write-Host ""

# Warte kurz und öffne dann den Browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# Starte den Node.js Server
npm start
