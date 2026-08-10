# TLS (Let's Encrypt) setup

The site is served over HTTPS on the OCI server with a real Let's Encrypt
certificate for **test.journeyofgrace.church** (HTTP-01 webroot challenge,
fully automatic renewal). A wildcard cert (`*.journeyofgrace.church` +
`journeyofgrace.church`) was issued once via manual DNS-01 but is NOT
auto-renewed; revisit wildcard automation when moving DNS to Cloudflare.

## How it works

- Host certbot (`dnf install epel-release certbot`) writes tokens to
  `webroot/.well-known/acme-challenge` in the repo; nginx serves
  `/.well-known/acme-challenge/` from the container (host dir mounted read-only).
- `docker-compose.yml` mounts the WHOLE `/etc/letsencrypt` dir into the
  container (read-only). Mounting only `live/<domain>` does NOT work: certbot's
  `live/*.pem` are symlinks into `archive/`, and nginx can't resolve them when
  the archive is outside the mount.
- nginx `:443` reads `/etc/letsencrypt/live/test.journeyofgrace.church/{fullchain,privkey}.pem`.
  The Dockerfile bakes a self-signed placeholder at that path so the container
  starts anywhere; the mount replaces it on the server.
- Renewal: systemd timer `jog-tls-renew.timer` (03:12 + 15:12 UTC daily) runs
  `scripts/tls-renew.sh test.journeyofgrace.church`, which calls
  `certbot renew --cert-name <host> --webroot -w webroot` and reloads nginx.
  The stock `certbot-renew.timer` is disabled to avoid double renewal.

## First-time setup (already done on the OCI server; documented for elsewhere)

```bash
# 1. DNS: A record for the hostname must point at this server
#    (test.journeyofgrace.church -> 129.146.181.82).

# 2. Install certbot and issue the first cert:
sudo dnf install -y epel-release certbot
scripts/tls-renew.sh test.journeyofgrace.church --bootstrap
# (the container must already run with the webroot volume from docker-compose.yml)

# 3. Serve the real cert: docker-compose.yml already mounts /etc/letsencrypt,
#    so just recreate the web container:
sudo docker compose up -d --build

# 4. Install the renewal timer:
sudo systemctl enable --now jog-tls-renew.timer
```

## Wildcard cert (DNS-01, manual TXT — future: Cloudflare automation)

Issued 2026-08-10 with:
`certbot certonly --manual --preferred-challenges dns-01 -d journeyofgrace.church -d "*.journeyofgrace.church"`
(requires TXT records `_acme-challenge.journeyofgrace.church` at Namecheap;
expires 2026-11-08, NOT auto-renewing). When DNS moves to Cloudflare, switch to
`certbot-dns-cloudflare` for automated wildcard renewal, then point nginx at
`/etc/letsencrypt/live/journeyofgrace.church/...`.

## Troubleshooting

- **nginx [emerg] cannot load certificate**: live/*.pem symlink broken — mount
  the whole /etc/letsencrypt, not just live/<domain>.
- **challenge 404**: token written to host webroot but container not recreated
  with the `./webroot/.well-known` volume.
- **verify renewal**: `sudo certbot renew --cert-name test.journeyofgrace.church --webroot -w webroot --dry-run --no-random-sleep-on-renew`
