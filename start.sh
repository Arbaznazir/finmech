#!/usr/bin/env bash
# Start FinMech backend + frontend in separate Terminal windows (macOS).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '${ROOT}/backend' && ([ -f .env ] && set -a && source .env && set +a); npm run dev"
  do script "cd '${ROOT}/frontend' && npm run dev"
end tell
EOF

printf '\nFinMech dev servers opening in two Terminal windows:\n'
printf '  Backend:  http://localhost:5001\n'
printf '  Frontend: http://localhost:3000\n\n'
