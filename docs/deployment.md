# Deployment

The site deploys to a single production server (Oracle Cloud compute instance)
from the `main` branch. All deployment details that involve credentials,
keys, or server access live in the gitignored `AGENTS.md` — this page stays
secret-free and documents the pipeline itself.

## Deployment model

- **Repo:** `github.com/JourneyofGrace/journeyofgrace-site`, branch `main`.
- **Server:** AlmaLinux 9.8 instance, serves the site via Docker Compose
  (nginx for the static site, plus a Node relay for Planning Center form
  submissions).
- **Repo checkout on the server:** `/opt/jog/journeyofgrace-site`, owned by
  local user `jog`.
- **Image:** nginx built from `docker/Dockerfile` — it runs `npm run content`
  at build time to inject `content/*.md` into the `*.html` shells, then serves
  the result on ports 80/443.

## Automatic deploys

Any push to `main` triggers the **"Deploy to OCI Server"** workflow
(`.github/workflows/deploy-server.yml`). It:

1. Connects over SSH with a dedicated deploy key (stored as a GitHub Actions
   secret).
2. Runs `git pull --ff-only origin main` in the repo checkout.
3. Runs `docker compose up -d --build` to rebuild the nginx image with the
   fresh files and recreate the container.

Deploys are serialized with a concurrency group; a slow build never overlaps
a newer push.

## Verifying a deploy

```bash
gh run list --workflow "Deploy to OCI Server" --limit 1 --json status,conclusion,headSha

# confirm the live files match the repo (should print no diff):
diff <(curl -s http://129.146.181.82/css/style.css) css/style.css
```

## Manual deploy

```bash
ssh -i ~/.ssh/jog-oci opc@129.146.181.82 \
  'sudo -u jog git -C /opt/jog/journeyofgrace-site pull --ff-only origin main && \
   sudo docker compose -f /opt/jog/journeyofgrace-site/docker-compose.yml up -d --build'
```

The repo is owned by `jog`, so git must run as that user (`sudo -u jog`);
`opc` has passwordless `sudo`. If git reports "dubious ownership", add
`git config --global --add safe.directory /opt/jog/journeyofgrace-site`.

## Local preview

```bash
python3 -m http.server 8126
```

The local server serves `*.html` files verbatim (no extension stripping), so
browse `/about-us.html`; nginx on the production server strips the extension
for pretty URLs.

## Related

- `docs/TLS.md` — swapping the self-signed placeholder cert for Let's Encrypt.
- `docs/planning-center.md` — the form-submission relay.
- `AGENTS.md` (gitignored) — full infrastructure and access notes.
