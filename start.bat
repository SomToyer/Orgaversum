@echo off
REM Orgaversum Starter Script für Windows
REM Doppelklick auf diese Datei zum Starten

echo ============================================
echo      Starte Orgaversum Server...
echo ============================================
echo.

REM Navigiere zum Script-Verzeichnis
cd /d "%~dp0"

REM Prüfe ob node_modules existiert
if not exist "node_modules\" (
    echo [*] Installiere Dependencies...
    call npm install
    echo [+] Installation abgeschlossen!
    echo.
)

REM Starte den Server
echo [*] Starte Server...
echo [*] Browser oeffnet sich unter: http://localhost:3000
echo.
echo [!] Zum Beenden druecke STRG+C
echo.

REM Warte kurz und öffne Browser
timeout /t 2 /nobreak > nul
start http://localhost:3000

REM Starte Node.js Server
call npm start
