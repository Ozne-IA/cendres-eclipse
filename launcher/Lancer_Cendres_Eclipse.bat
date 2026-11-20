@echo off
setlocal enabledelayedexpansion
title Cendres de l'Eclipse - Lanceur PC
cd /d "%~dp0.."

echo ========================================================
echo    CENDRES DE L'ECLIPSE - LANCEUR PC STANDALONE
echo ========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js 22.12+ est requis pour executer le jeu en local.
  echo Telechargez-le sur https://nodejs.org puis relancez ce script.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installation des dependances...
  call npm ci
  if errorlevel 1 (
    echo.
    echo [ERREUR] L'installation des dependances a echoue.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo [INFO] Compilation de la version PC optimisee...
  call npm run build
  if not exist "dist\index.html" (
    echo.
    echo [ERREUR] La compilation a echoue. Verifiez les messages ci-dessus.
    pause
    exit /b 1
  )
)

echo [INFO] Demarrage du serveur local sur http://127.0.0.1:4173 ...
start "CendresServer" /min cmd /c "node launcher\server-pc.mjs --port=4173 --no-open"
timeout /t 2 /nobreak >nul

set "BROWSER_FOUND=0"
for %%P in (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
) do (
  if "!BROWSER_FOUND!"=="0" if exist %%P (
    start "" %%P --app="http://127.0.0.1:4173/" --window-size=1440,840
    set "BROWSER_FOUND=1"
  )
)

if "!BROWSER_FOUND!"=="0" (
  start "" "http://127.0.0.1:4173/"
)

echo [OK] Cendres de l'Eclipse est lance !
