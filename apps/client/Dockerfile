# Build:
# docker buildx build --platform linux/amd64,linux/arm64 -f apps/client/Dockerfile -t nulldoubt/pepperminto-client:latest --push .
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat git ca-certificates openssh

FROM base AS installer
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPECHECK=1
RUN pnpm turbo run build --filter=client...
RUN mkdir -p /app/apps/client/.next/standalone/apps/client/.next
RUN cp -r /app/apps/client/.next/static /app/apps/client/.next/standalone/apps/client/.next/static
RUN cp -r /app/apps/client/public /app/apps/client/.next/standalone/apps/client/public

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
COPY --from=installer /app .

EXPOSE 3002
CMD ["node", "apps/client/.next/standalone/apps/client/server.js"]
