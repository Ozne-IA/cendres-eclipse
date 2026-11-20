import type { QualityLevel } from './types';

export interface PcLauncherConfig {
  port: number;
  appMode: boolean;
  fullscreen: boolean;
  autostart: boolean;
  fogQuality: QualityLevel;
  showFps: boolean;
}

export function sanitizePort(port: number): number {
  const n = Math.round(Number(port) || 4173);
  if (n < 1024 || n > 65535) return 4173;
  return n;
}

export function buildLaunchUrl(cfg: PcLauncherConfig): string {
  const port = sanitizePort(cfg.port);
  const params = new URLSearchParams();
  params.set('pc_launcher', '1');
  if (cfg.autostart) params.set('autostart', '1');
  if (cfg.fullscreen) params.set('fullscreen', '1');
  if (cfg.fogQuality !== 'high') params.set('fog', cfg.fogQuality);
  if (cfg.showFps) params.set('fps', '1');
  const q = params.toString();
  return `http://127.0.0.1:${port}/${q ? `?${q}` : ''}`;
}

export function generateWindowsBat(cfg: PcLauncherConfig): string {
  const port = sanitizePort(cfg.port);
  const url = buildLaunchUrl(cfg);
  const appArg = cfg.appMode ? '--app' : '--new-window';
  const fsArg = cfg.fullscreen ? ' --start-fullscreen' : '';

  return `@echo off
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

if not exist "dist\\index.html" (
  echo [INFO] Compilation de la version PC optimisee...
  call npm run build
  if not exist "dist\\index.html" (
    echo.
    echo [ERREUR] La compilation a echoue. Verifiez les messages ci-dessus.
    pause
    exit /b 1
  )
)

echo [INFO] Demarrage du serveur local sur http://127.0.0.1:${port} ...
start "CendresServer" /min cmd /c "node launcher\\server-pc.mjs --port=${port} --no-open"
timeout /t 2 /nobreak >nul

set "BROWSER_FOUND=0"
for %%P in (
  "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
  "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
  "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
  "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
  "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
) do (
  if "!BROWSER_FOUND!"=="0" if exist %%P (
    start "" %%P ${appArg}="${url}"${fsArg} --window-size=1440,840
    set "BROWSER_FOUND=1"
  )
)

if "!BROWSER_FOUND!"=="0" (
  start "" "${url}"
)

echo [OK] Cendres de l'Eclipse est lance !
echo Fermez la fenetre du jeu pour terminer votre session.
`;
}

export function generatePowerShellLauncher(cfg: PcLauncherConfig): string {
  const port = sanitizePort(cfg.port);
  const url = buildLaunchUrl(cfg);
  const appFlag = cfg.appMode ? "--app=$Url" : "--new-window $Url";
  const fsFlag = cfg.fullscreen ? ", '--start-fullscreen'" : '';

  return `# Cendres de l'Eclipse - Lanceur PowerShell PC
param(
  [int]$Port = ${port}
)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERREUR] Node.js 22.12+ introuvable. Installez-le depuis https://nodejs.org" -ForegroundColor Red
  Read-Host "Appuyez sur Entree pour quitter"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "[INFO] Installation des dependances npm..." -ForegroundColor Yellow
  npm ci
}

if (-not (Test-Path "dist\\index.html")) {
  Write-Host "[INFO] Compilation du build PC..." -ForegroundColor Yellow
  npm run build
  if (-not (Test-Path "dist\\index.html")) {
    Write-Host "[ERREUR] La compilation a echoue. dist\\index.html est introuvable." -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
  }
}

$Url = "${url}".Replace(":${port}", ":$Port")
$serverProc = Start-Process -FilePath "node" -ArgumentList "launcher/server-pc.mjs", "--port=$Port", "--no-open" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

$candidates = @(
  "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
  "$env:LocalAppData\\Google\\Chrome\\Application\\chrome.exe"
)

$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($exe) {
  $argsList = @("${appFlag}"${fsFlag}, "--window-size=1440,840")
  Start-Process -FilePath $exe -ArgumentList $argsList
} else {
  Start-Process $Url
}

Write-Host "[OK] Cendres de l'Eclipse en cours d'execution sur $Url (PID serveur: $($serverProc.Id))" -ForegroundColor Green
`;
}

export function generateUnixShLauncher(cfg: PcLauncherConfig): string {
  const port = sanitizePort(cfg.port);
  const url = buildLaunchUrl(cfg);
  const appOpt = cfg.appMode ? `--app="${url}"` : `"${url}"`;
  const fsOpt = cfg.fullscreen ? ' --start-fullscreen' : '';

  return `#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERREUR] Node.js 22.12+ requis : https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  npm ci
fi

if [ ! -f "dist/index.html" ]; then
  echo "[INFO] Compilation de Cendres de l'Eclipse..."
  npm run build
fi

echo "[INFO] Demarrage du serveur PC sur http://127.0.0.1:${port} ..."
node launcher/server-pc.mjs --port=${port} --no-open &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

sleep 1.5
URL="${url}"

if command -v google-chrome >/dev/null 2>&1; then
  google-chrome ${appOpt}${fsOpt} --window-size=1440,840 >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
  chromium ${appOpt}${fsOpt} --window-size=1440,840 >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open -na "Google Chrome" --args ${appOpt}${fsOpt} || open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

echo "[OK] Lance sur $URL (Ctrl+C pour fermer le serveur PC)"
wait $SERVER_PID
`;
}

export function generatePcLauncherReadme(cfg: PcLauncherConfig): string {
  const port = sanitizePort(cfg.port);
  return `# Cendres de l'Eclipse - Guide du Lanceur PC

## Execution directe depuis votre PC
1. Assurez-vous d'avoir Node.js 22.12+ installe (https://nodejs.org).
2. Double-cliquez sur \`Lancer_Cendres_Eclipse.bat\` (Windows) ou executez \`./Lancer_Cendres_Eclipse.sh\` (macOS / Linux), ou lancez \`npm run start:pc\`.
3. Le serveur local servira automatiquement la version compilee \`dist/\` sur \`http://127.0.0.1:${port}/?pc_launcher=1\`${cfg.appMode ? ' dans une fenetre dediee sans barre d’adresse (--app).' : '.'}
4. Votre progression est automatiquement synchronisee sur disque dans \`cendres-eclipse-save.json\` a la racine du dossier du jeu.

## Options configurees
- Port local : ${port}
- Mode fenetre dediee (--app) : ${cfg.appMode ? 'Active' : 'Desactive'}
- Plein ecran au demarrage : ${cfg.fullscreen ? 'Oui' : 'Non'}
- Brouillard volumetrique : ${cfg.fogQuality}
- Compteur FPS : ${cfg.showFps ? 'Active' : 'Desactive'}
`;
}
