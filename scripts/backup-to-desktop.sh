#!/usr/bin/env bash
# Sentotrade full backup → Desktop. Run from Terminal:
#   cd "/Users/HugoAdmin/Desktop/Sentotrade cusorkimi"
#   bash scripts/backup-to-desktop.sh
#
# You need: Git repo here, SSH key, same server path as your deploys.

set -e
STAMP=$(date +%Y-%m-%d-%H%M)
OUT="${HOME}/Desktop/Sentotrade-backup-${STAMP}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

SSH_KEY="${HOME}/.ssh/id_ed25519"
SSH_HOST="vmbsinyo@102.209.117.181"
REMOTE_DIR="/home/vmbsinyo/glasstrade-sandbox"

mkdir -p "${OUT}"

echo ""
echo "=== 1/4  Saving full Git history (one file) ==="
git bundle create "${OUT}/sentotrade-code.bundle" --all
echo "    → ${OUT}/sentotrade-code.bundle"

echo ""
echo "=== 2/4  Saving project files (no node_modules, no dist) ==="
tar -czf "${OUT}/sentotrade-project-files.tgz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='dist.tar.gz' \
  .
echo "    → ${OUT}/sentotrade-project-files.tgz"

echo ""
echo "=== 3/4  Saving local .env if it exists (PRIVATE — keep safe) ==="
if [[ -f .env ]]; then
  cp .env "${OUT}/LOCAL-ENV-BACKUP-PRIVATE.txt"
  echo "    → ${OUT}/LOCAL-ENV-BACKUP-PRIVATE.txt"
else
  echo "    (no .env in this folder — skipped)"
fi

echo ""
echo "=== 4/4  Downloading live server files over SSH ==="
if [[ ! -f "${SSH_KEY}" ]]; then
  echo "    SSH key not found: ${SSH_KEY}"
  echo "    Edit scripts/backup-to-desktop.sh and set SSH_KEY if yours differs."
else
  OK=0
  scp -i "${SSH_KEY}" -o ConnectTimeout=15 \
    "${SSH_HOST}:${REMOTE_DIR}/predictions.jsonl" \
    "${SSH_HOST}:${REMOTE_DIR}/stats.jsonl" \
    "${SSH_HOST}:${REMOTE_DIR}/server.mjs" \
    "${OUT}/" && OK=1 || true
  if [[ "${OK}" -eq 1 ]]; then
    echo "    → predictions.jsonl, stats.jsonl, server.mjs"
  else
    echo "    Server download failed (wrong key, path, or server down). Code backup above still OK."
  fi
  # Optional: server .env — often missing; ignore errors
  scp -i "${SSH_KEY}" -o ConnectTimeout=10 \
    "${SSH_HOST}:${REMOTE_DIR}/.env" \
    "${OUT}/SERVER-ENV-BACKUP-PRIVATE.txt" 2>/dev/null && echo "    → SERVER-ENV-BACKUP-PRIVATE.txt" || echo "    (no server .env or not readable — skipped)"
fi

cat > "${OUT}/README-WHAT-THIS-IS.txt" << 'EOF'
Sentotrade backup folder
------------------------

sentotrade-code.bundle
  Full Git history. Restore on ANY machine:
    mkdir fresh && cd fresh && git clone sentotrade-code.bundle .

sentotrade-project-files.tgz
  Snapshot of source + public scripts (no node_modules).
  Unzip:  tar -xzf sentotrade-project-files.tgz

LOCAL-ENV-BACKUP-PRIVATE.txt / SERVER-ENV-BACKUP-PRIVATE.txt
  Secrets. Do NOT email or upload publicly. Store like a password file.

predictions.jsonl / stats.jsonl / server.mjs
  Copied from your VPS (if step 4 succeeded). This is your live prediction log + stats + server code.

GitHub still has your main code if you push regularly — this folder is your offline safety net.
EOF

echo ""
echo "DONE. Your backup is here:"
echo "    ${OUT}"
echo ""
echo "Copy that whole folder to a USB drive or cloud if you want off-site safety."
echo ""
