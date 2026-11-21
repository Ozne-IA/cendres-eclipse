@echo off
title Cendres de l'Eclipse
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js 22.12 ou plus recent est requis pour jouer.
  echo Telechargez-le sur https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)

echo Cendres de l'Eclipse : le jeu s'ouvre dans une fenetre. Laissez cette fenetre ouverte pendant que vous jouez.
node launcher\server-pc.mjs %*
pause
