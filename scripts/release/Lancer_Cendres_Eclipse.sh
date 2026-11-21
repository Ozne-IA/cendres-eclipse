#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "[ERREUR] Node.js 22.12 ou plus recent est requis (https://nodejs.org)."
  exit 1
fi
exec node launcher/server-pc.mjs "$@"
