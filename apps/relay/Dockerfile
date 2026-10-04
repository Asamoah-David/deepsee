# syntax=docker/dockerfile:1

# The relay is a self-contained package: it has no workspace dependencies, so
# its build context is apps/relay and it installs from its own package.json.
# (The Command Center image is the opposite case and needs repo-root context -
# see apps/web/Dockerfile.)

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

# TypeScript and the @types packages are devDependencies, so this stage needs a
# full install in order to run `tsc`.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

# Produces dist/. Without this step the runtime stage below would copy a
# directory that does not exist in the build context, because dist/ is
# gitignored - the reason the previous single-stage image could never deploy.
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist

# Run unprivileged. A relay holds authenticated sockets for many tenants, so it
# should not also be root (§140).
USER node

EXPOSE 8080

# Node's built-in fetch is used instead of wget so the check cannot depend on
# busybox applets surviving a base image change.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]