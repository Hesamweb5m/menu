# node:sqlite is built into Node, so this image needs no compiler toolchain and
# no native modules. Node 22.5+ is required for it.
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy manifests first so `docker build` reuses the dependency layer whenever
# only application code changed.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts

# The database (menu content plus uploaded images) lives here. Mount a volume
# at this path, or uploads disappear on the next deploy.
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 1337

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||1337)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "src/index.js"]
