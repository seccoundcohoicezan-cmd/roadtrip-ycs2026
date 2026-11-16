# Server data YCS 2026 (Dokploy). Konteks build = root repo (butuh apps-script/Code.gs & assets/js/monster-aturan.js).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
COPY server/ server/
COPY apps-script/Code.gs apps-script/Code.gs
COPY assets/js/monster-aturan.js assets/js/monster-aturan.js
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1
CMD ["node", "server/index.cjs"]
