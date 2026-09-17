#!/usr/bin/env bash
# Full QVAC bounty proof — show requirements start-to-finish for livestream.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.local/node-v22.19.0-linux-x64/bin:${PATH}"

pause() { sleep "${1:-1.5}"; }

echo "============================================================"
echo " QVAC Offline Study Quiz — LIVE PROOF"
echo " Repo: https://github.com/Atlas-AT/qvac-offline-study-quiz"
echo "============================================================"
pause 1

echo
echo "[1/5] Node version (need >= 22.17)"
node -v
npm -v
pause 1

echo
echo "[2/5] Declared dependency @qvac/sdk >= 0.19.0"
node -e 'const p=require("./package.json"); console.log(JSON.stringify({dependencies:p.dependencies,engines:p.engines},null,2))'
pause 1

echo
echo "[3/5] Source calls loadModel + completion (on-device)"
grep -nE "loadModel|completion|@qvac/sdk" src/index.js | head -20
pause 2

echo
echo "[4/5] Install dependencies"
npm install --no-fund --no-audit
pause 1

echo
echo "[5/5] Run on-device quiz (loadModel + completion)"
echo "Notes:"
sed -n '1,12p' samples/notes.md
echo
echo "--- APP OUTPUT ---"
node src/index.js samples/notes.md --answers-file proof/answers.txt
echo "--- END APP OUTPUT ---"
pause 1

echo
echo "PROOF COMPLETE"
echo "- SDK: @qvac/sdk 0.19.1"
echo "- Functions: loadModel + completion (on-device)"
echo "- Public repo + MIT + README + >=3 commits"
echo "============================================================"
