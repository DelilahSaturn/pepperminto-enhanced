FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat git ca-certificates openssh

#
# Build API (turbo prune -> install -> prisma generate -> build)
#
FROM base AS api_builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm dlx turbo@2.7.2 prune --scope=api --docker

FROM base AS api_installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=api_builder /app/out/json/ .
COPY --from=api_builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile --ignore-scripts
COPY --from=api_builder /app/out/full/ .
COPY turbo.json /app/turbo.json
RUN pnpm --filter api exec prisma generate --schema ./src/prisma/schema.prisma
RUN pnpm --filter api build

#
# Build Client (turbo prune -> install -> build -> standalone output)
#
FROM base AS client_builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json package.json ./
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm dlx turbo@2.7.2 prune --scope=client --docker

FROM base AS client_installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=client_builder /app/out/json/ .
COPY --from=client_builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
COPY --from=client_builder /app/out/full/ .
COPY turbo.json /app/turbo.json
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPECHECK=1

ARG API_URL
ENV API_URL=$API_URL

ARG BASE_URL
ENV BASE_URL=$BASE_URL

ARG DASHBOARD_URL
ENV DASHBOARD_URL=$DASHBOARD_URL

ARG KNOWLEDGE_BASE_URL
ENV KNOWLEDGE_BASE_URL=$KNOWLEDGE_BASE_URL

RUN pnpm turbo run build --filter=client...

#
# Runtime: PM2 runs both apps (client on 3000, api on 3001)
#
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install PM2 globally (npm, not pnpm global)
RUN npm install -g pm2

# API runtime files (includes built dist + deps)
COPY --from=api_installer /app/ ./

# Client standalone runtime files (server.js at apps/client/server.js)
COPY --from=client_installer /app/apps/client/.next/standalone/apps/client ./apps/client
COPY --from=client_installer /app/apps/client/.next/static ./apps/client/.next/static
COPY --from=client_installer /app/apps/client/public ./apps/client/public

# pnpm uses symlinks into /app/node_modules/.pnpm. The client runtime needs the
# Next.js packages present there (API-only install won't include them).
COPY --from=client_installer /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=client_installer /app/node_modules/.modules.yaml ./node_modules/.modules.yaml

COPY ecosystem.config.js ./ecosystem.config.js

EXPOSE 3000 3001
CMD ["pm2-runtime", "ecosystem.config.js"]
