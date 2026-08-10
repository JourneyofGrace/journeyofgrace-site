# ---- Build stage: render content/*.md into the static HTML files ----
# The build scripts (scripts/build-content.mjs, scripts/layout.mjs) are plain
# Node scripts that use only built-in modules, so no `npm install` is needed.
FROM node:20-alpine AS build

WORKDIR /src
COPY . .

# Injects content/*.md into the matching *.html files (idempotent).
RUN npm run content

# ---- Runtime stage: tiny static file server (nginx:alpine ~50MB) ----
FROM nginx:alpine

# Site hostname used for the TLS placeholder cert. Override at build time if
# you serve a custom domain:  docker build --build-arg DOMAIN=journeyofgrace.church ...
ARG DOMAIN=journeyofgrace.church

# nginx config maps extensionless page links (e.g. /about-us) to .html,
# mirroring GitHub Pages' pretty-URL behaviour. Serves on :80 + :443.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src /usr/share/nginx/html/

# Generate a self-signed placeholder TLS cert at the same path nginx reads
# (/etc/letsencrypt/live/...) so the :443 server block starts anywhere.
# Mount real Let's Encrypt certs over /etc/letsencrypt to replace it (see
# docs/TLS.md).
RUN apk add --no-cache openssl \
    && mkdir -p /etc/letsencrypt/live/test.journeyofgrace.church \
    && openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
        -keyout /etc/letsencrypt/live/test.journeyofgrace.church/privkey.pem \
        -out /etc/letsencrypt/live/test.journeyofgrace.church/fullchain.pem \
        -subj "/CN=${DOMAIN}" \
        -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN}" 2>/dev/null \
    && apk del openssl

EXPOSE 80 443
