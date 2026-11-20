# Cendres de l'Eclipse - Lanceur PowerShell PC
param(
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERREUR] Node.js 18+ introuvable. Installez-le depuis https://nodejs.org" -ForegroundColor Red
  Read-Host "Appuyez sur Entree pour quitter"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "[INFO] Installation des dependances npm..." -ForegroundColor Yellow
  npm install --legacy-peer-deps
}

if (-not (Test-Path "dist\index.html")) {
  Write-Host "[INFO] Compilation du build PC..." -ForegroundColor Yellow
  npm run build
  if (-not (Test-Path "dist\index.html")) {
    Write-Host "[ERREUR] La compilation a echoue. dist\index.html est introuvable." -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
  }
}

$Url = "http://127.0.0.1:$Port/"
$serverProc = Start-Process -FilePath "node" -ArgumentList "launcher/server-pc.mjs", "--port=$Port", "--no-open" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

$candidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($exe) {
  Start-Process -FilePath $exe -ArgumentList @("--app=$Url", "--window-size=1440,840")
} else {
  Start-Process $Url
}

Write-Host "[OK] Cendres de l'Eclipse en cours d'execution sur $Url (PID serveur: $($serverProc.Id))" -ForegroundColor Green
