# TLS (Let's Encrypt) setup

The Docker image ships HTTPS out of the box: `docker/nginx.conf` has a `:443`
server block that reads a self-signed placeholder cert from `/etc/nginx/tls`
(generated at image build time), so TLS works on any host immediately. This page
explains how to swap in a free, auto-renewing Let's Encrypt certificate — no
code changes, just a mount and a renew script.

## Overview

- Certs live on the **Docker host** at `/etc/letsencrypt` (standard certbot layout).
- The nginx `:443` block reads `/etc/nginx/tls/{fullchain,privkey}.pem`; by
  default those are a self-signed placeholder baked into the image.
- To serve the real cert, mount the host's certdir for your domain over
  `/etc/nginx/tls` (read-only) — see the commented `volumes` entry in
  `docker-compose.yml`.
- Renewal is handled by `scripts/tls-renew.sh`, scheduled via a systemd timer
  (or cron) on the host; it reloads nginx after renewing.
- Port 80 stays open because certbot's ACME challenge
  (`/.well-known/acme-challenge/`) must be reachable on plain HTTP.

## 1. Point DNS at your host

Add an `A` record for your domain (and `www`) pointing at the host's public IP
(e.g. the OCI instance `129.146.181.82`). Cert issuance fails until DNS resolves.

## 2. Obtain the first certificate

```bash
# from the repo root on the Docker host
scripts/tls-renew.sh journeyofgrace.church --bootstrap
```

This issues a cert via `certbot certonly --webroot`, writing to
`/etc/letsencrypt/live/journeyofgrace.church/`.

(If `certbot` is not installed on the host, the script falls back to running the
official `certbot/certbot` image.)

## 3. Serve the real cert

Uncomment the volume override in `docker-compose.yml` (replace the domain):

```yaml
  web:
    volumes:
      - /etc/letsencrypt/live/journeyofgrace.church:/etc/nginx/tls:ro
```

Then bring the stack back up:

```bash
docker compose up -d web
```

The nginx config already points `:443` at `/etc/nginx/tls/...`, so no config
edit is needed — the mounted real cert simply replaces the placeholder.

## 4. Redirect HTTP → HTTPS (optional)

In `docker/nginx.conf`, on the `:80` block, uncomment:

```nginx
return 301 https://$host$request_uri;
```

then reload:

```bash
docker compose exec -T journeyofgrace-site nginx -s reload
```

## 5. Auto-renew

Install a systemd timer that runs the renewal script twice a day as root:

```bash
sudo tee /etc/systemd/system/jog-tls-renew.service >/dev/null <<'EOF'
[Unit]
Description=Renew Journey of Grace Let's Encrypt certs
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash /opt/jog/journeyofgrace-site/scripts/tls-renew.sh journeyofgrace.church
User=root
EOF

sudo tee /etc/systemd/system/jog-tls-renew.timer >/dev/null <<'EOF'
[Unit]
Description=Run Journey of Grace cert renewal twice daily

[Timer]
OnCalendar=*-*-* 03:12:00
OnCalendar=*-*-* 15:12:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now jog-tls-renew.timer
```

certbot only re-issues when the cert is < 30 days from expiry, so the timer is
idempotent; the script reloads nginx so a renewed cert takes effect immediately.

## Notes / troubleshooting

- **ACME challenge root:** `docker/nginx.conf` already routes
  `/.well-known/acme-challenge/` to `/usr/share/nginx/html` on port 80. If a
  challenge fails, confirm the `A` record resolves and port 80 is reachable from
  the internet (`curl -v http://<domain>/.well-known/acme-challenge/x`).
- **Placeholder cert:** browsers warn on the self-signed cert until the real
  cert is mounted — that is expected scaffolding.
- **`certbot: command not found`:** install it (`dnf install certbot -y` on
  AlmaLinux/RHEL family) or rely on the built-in docker fallback in the script.
- **Non-standard hosts:** everything is plain Docker/nginx — the same steps work
  on any host that can run `docker compose`.
- **Repo portability:** `docker-compose.yml`, `docker/nginx.conf`,
  `scripts/tls-renew.sh`, and this doc live in the repo, so a fresh clone +
  `docker compose up -d` reproduces the deployment anywhere (including the cert
  scaffold). Rebuild the `web` image with `docker compose up -d --build web`
  when `content/*.md` or `docker/nginx.conf` change.
