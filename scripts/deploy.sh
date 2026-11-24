#!/usr/bin/env bash
# Production redeploy for the Oracle A1 VM. Intended to be run on the server,
# after checking out this repo there. Safe to re-run; not meant for Windows.
#
#   chmod +x /home/ubuntu/scrimlypro/scripts/deploy.sh
#   sudo ln -sf /home/ubuntu/scrimlypro/scripts/deploy.sh /usr/local/bin/deploy-scrimlypro
#   deploy-scrimlypro
#
# Override with APP_DIR / SERVICE / PORT env vars if your layout differs.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/scrimlypro}"
SERVICE="${SERVICE:-scrimlypro}"
PORT="${PORT:-3000}"

echo "==> deploy: ${APP_DIR} (service ${SERVICE})"
cd "$APP_DIR"

# Stop first: `npm ci` replaces node_modules while the running process still
# has lazy-loaded route modules, which can fail mid-request. This trades a
# short, honest downtime for a predictable deploy.
sudo systemctl stop "$SERVICE"

git pull --ff-only
npm ci
npm run db:migrate          # idempotent: applies committed migrations only
npm run build
npm run verify:secrets      # fail closed if secret material leaked into the bundle

sudo systemctl start "$SERVICE"

# /api/health is intentionally public; / would return 307 to /login.
echo "==> waiting for health on 127.0.0.1:${PORT}/api/health"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "==> health OK"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ABORT: health check failed after 60s — showing recent service logs:" >&2
    journalctl -u "$SERVICE" -n 50 --no-pager >&2 || true
    exit 1
  fi
  sleep 2
done

systemctl status "$SERVICE" --no-pager | head -5
echo "==> deploy complete"
