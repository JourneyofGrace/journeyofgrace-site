# Serve the Journey of Grace static site with nginx under the GitHub Pages
# base path (/journeyofgrace-site/) so no markup changes are required.
# Build from the repository root:
#   docker build -f docker/Dockerfile -t journeyofgrace-site .
FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/journeyofgrace-site/

EXPOSE 80
