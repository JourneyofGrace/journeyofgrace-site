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

# nginx config maps extensionless page links (e.g. /about-us) to .html,
# mirroring GitHub Pages' pretty-URL behaviour.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src /usr/share/nginx/html/journeyofgrace-site/

EXPOSE 80
