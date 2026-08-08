#!/usr/bin/env bash
#
# Let's Encrypt certificate bootstrap + auto-renew for the Journey of Grace
# Docker site.
#
# This runs on the Docker HOST (not in a container) because certbot needs to
# write /etc/letsencrypt (mounted read-only into the nginx container) and
# reload the running container afterwards. See docs/TLS.md for the full setup.
#
# Usage:
#   scripts/tls-renew.sh <hostname> [--bootstrap]
#
# Example:
#   scripts/tls-renew.sh journeyofgrace.church --bootstrap
#   scripts/tls-renew.sh journeyofgrace.church            # renewal run (cron/systemd)
#
# Notes:
#   - Requires: docker compose project already up, certbot available on host
#     (dnf install certbot) or the certbot image pulled.
#   - The nginx container must mount /etc/letsencrypt (see docker-compose.yml).
#   - --bootstrap also triggers an immediate issuance; plain runs only renew
#     when the cert is < 30 days from expiry (certbot default) and reload nginx.
set -euo pipefail

HOSTNAME="${1:?usage: scripts/tls-renew.sh <hostname> [--bootstrap]}"
BOOTSTRAP="${2:-}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_CONTAINER="${WEB_CONTAINER:-journeyofgrace-site}"
CERT_DIR="/etc/letsencrypt/live/${HOSTNAME}"
ACME_ROOT="${ACME_ROOT:-${PROJECT_DIR}/webroot}"
CERTBOT_CMD="${CERTBOT_CMD:-certbot}"
MISSING_CERT=0

log() { echo "[tls-renew] $*"; }

have_cert() { [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; }

# Try our best to obtain a cert when missing.
if ! have_cert; then
  log "no certificate present for ${HOSTNAME}"
  if [[ "${BOOTSTRAP}" != "--bootstrap" ]]; then
    log "run with --bootstrap to obtain an initial certificate"
    MISSING_CERT=1
  fi
fi

if [[ "${BOOTSTRAP}" == "--bootstrap" || "${MISSING_CERT}" == "0" ]]; then
  mkdir -p "${ACME_ROOT}/.well-known/acme-challenge"
fi

if [[ "${BOOTSTRAP}" == "--bootstrap" ]]; then
  log "bootstrapping webroot challenge at ${ACME_ROOT}"
  # Serve the webroot for the ACME challenge on port 80 (nginx already routes
  # /.well-known/acme-challenge/ to /usr/share/nginx/html; if the site is not
  # mounted with this webroot, fall back to certbot's own -w path below).
  if command -v "${CERTBOT_CMD}" >/dev/null 2>&1; then
    "${CERTBOT_CMD}" certonly --webroot \
      -w "${ACME_ROOT}" \
      -d "${HOSTNAME}" \
      --non-interactive --agree-tos --register-unsafely-without-email \
      --keep-until-expiring
  else
    # Fallback: run the official certbot image, sharing the webroot + /etc/letsencrypt.
    docker run --rm \
      -v "${ACME_ROOT}:/webroot" \
      -v /etc/letsencrypt:/etc/letsencrypt \
      certbot/certbot certonly --webroot \
        -w /webroot \
        -d "${HOSTNAME}" \
        --non-interactive --agree-tos --register-unsafely-without-email \
        --keep-until-expiring
  fi
  log "certificate obtained for ${HOSTNAME}"
fi

# Renewal run (also skips cleanly if cert still valid).
if have_cert || [[ "${MISSING_CERT}" == "1" ]]; then
  if command -v "${CERTBOT_CMD}" >/dev/null 2>&1; then
    "${CERTBOT_CMD}" renew --webroot -w "${ACME_ROOT}" --quiet || true
  else
    docker run --rm \
      -v "${ACME_ROOT}:/webroot" \
      -v /etc/letsencrypt:/etc/letsencrypt \
      certbot/certbot renew --webroot -w /webroot --quiet || true
  fi
fi

# Reload nginx only if we actually have certs now (or already did).
if have_cert; then
  log "reloading ${WEB_CONTAINER} to pick up certs"
  docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T "${WEB_CONTAINER}" nginx -s reload 2>/dev/null \
    || docker kill --signal=HUP "${WEB_CONTAINER}" 2>/dev/null \
    || log "nginx reload skipped (container not running)"
fi

log "done"
