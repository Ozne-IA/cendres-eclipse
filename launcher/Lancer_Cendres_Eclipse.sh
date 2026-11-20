#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

node launcher/server-pc.mjs --port=4173 --no-open &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

sleep 1.5
URL="http://127.0.0.1:4173/"

if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app="$URL" --window-size=1440,840 >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
  chromium --app="$URL" --window-size=1440,840 >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open -na "Google Chrome" --args --app="$URL" || open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

echo "[OK] Lance sur $URL (Ctrl+C pour fermer le serveur PC)"
wait $SERVER_PID
