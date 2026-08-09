#!/usr/bin/env bash
# jog-refresh: server-side refresh of sermons.html / events.html (OCI cron).
# Run as user `jog` (repo owner). PCO credentials are read from .env.pco
# (chmod 600, gitignored); sermons fetch needs no credentials.
set -euo pipefail

REPO=/opt/jog/journeyofgrace-site
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

echo "=== jog-refresh $(date -u +%FT%TZ) ==="
cd "$REPO"

git pull --ff-only origin main

if [ -f .env.pco ]; then
  set -a
  . ./.env.pco
  set +a
else
  echo "WARN: no .env.pco - events refresh will have no PCO credentials"
fi

FETCH_STATUS=0
docker run --rm \
  -v "$REPO":/repo -w /repo \
  -v jog-npm-cache:/root/.npm \
  mcr.microsoft.com/playwright:v1.62.1-jammy \
  bash -c 'npm ci --no-audit --no-fund --silent && node scripts/fetch-sermons.mjs' \
  || FETCH_STATUS=1

if [ -f .env.pco ]; then
  docker run --rm \
    -v "$REPO":/repo -w /repo \
    -v jog-npm-cache:/root/.npm \
    -e PCO_CLIENT_ID -e PCO_SECRET -e PCO_GROUP_WHITELIST -e PCO_CALENDAR_TAG \
    mcr.microsoft.com/playwright:v1.62.1-jammy \
    bash -c 'npm ci --no-audit --no-fund --silent && node scripts/fetch-events.mjs' \
    || { echo "WARN: events fetch failed"; FETCH_STATUS=1; }
else
  echo "WARN: no .env.pco - skipping events fetch"
fi

if git diff --quiet -- sermons.html events.html; then
  CHANGED=no
else
  CHANGED=yes
fi

if [ "$CHANGED" = yes ]; then
  git add sermons.html events.html
  git -c user.name="github-actions[bot]" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -m "chore(ci): refresh sermons.html and events.html with latest content"
  git push origin main
fi

docker compose up -d --build
echo "=== jog-refresh done ($CHANGED, fetch_status=$FETCH_STATUS) ==="
exit "$FETCH_STATUS"
