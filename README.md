<h1 align="center">Pepperminto Ticket Management 🍵</h1>
<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.2-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/docker/pulls/pepperlabs/peppermint" />
</p>
<p align="center">
    <img src="./static/logo.svg" alt="Logo" height="80px" >
</p>

Pepperminto is a community-maintained fork of Peppermint, focused on a clean, modern admin experience, a public knowledge base, and an updated monorepo workflow.

## ❤️ Fork credits

This is a fork of the original Peppermint project.

- Original repository: https://github.com/Peppermint-Lab/peppermint
- Thank you to the original author and the Peppermint contributors for their work.

## ✨ Highlights

- Modernized admin UI with shadcn components and dark-mode support.
- Public knowledge base with admin-only CRUD workflows.
- Rich-text editing using BlockNote across tickets, documents, and KB.
- Turborepo + pnpm workspace for fast local development.

## 📦 Monorepo layout

- `apps/api` – Fastify API server
- `apps/client` – Admin dashboard (Next.js)
- `apps/knowledge-base` – Public knowledge base (Next.js)

## 🚀 Local development

```bash
pnpm install
pnpm dev
```

Environment variables:

- Copy `.env.example` to `.env` and adjust values as needed.

Default admin (fresh database only):

- Email: `admin@admin.com`
- Password: `1234`

You should log in and change these immediately.

Default ports:

- Public knowledge base → `http://localhost:3122/`
- Dashboard → `http://localhost:3122/dashboard`
- Dashboard KB (read-only) → `http://localhost:3122/dashboard/kb`
- Admin → `http://localhost:3122/admin`
- API (direct) → `http://localhost:3121`

## 🐳 Docker buildx commands

```bash
## 1) Build locally (no push)
# Copy env and set SECRET before running
cp .env.example .env
docker compose build
docker compose up -d

## 2) Publish (single image)
# This builds the combined `client` + `api` image from the repo-root Dockerfile.
docker buildx build --platform linux/amd64,linux/arm64 \
  -f Dockerfile \
  -t delilahsaturn/pepperminto:latest \
  --push .
```

## Repo

- Pepperminto fork: https://github.com/DelilahSaturn/pepperminto

## License

See `LICENSE` for licensing details.
