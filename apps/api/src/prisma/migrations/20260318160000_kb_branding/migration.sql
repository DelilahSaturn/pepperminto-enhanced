CREATE TABLE "KnowledgeBaseBranding" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'Knowledge Base',
    "title" TEXT NOT NULL DEFAULT 'Help Center',
    "subtitle" TEXT NOT NULL DEFAULT 'Search curated guides, troubleshooting checklists, and step-by-step workflows. Articles here are written by the team and updated with every release.',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#14b8a6',
    CONSTRAINT "KnowledgeBaseBranding_pkey" PRIMARY KEY ("id")
);

INSERT INTO "KnowledgeBaseBranding" ("id", "updatedAt", "siteName", "title", "subtitle", "accentColor")
VALUES (gen_random_uuid(), NOW(), 'Knowledge Base', 'Help Center', 'Search curated guides, troubleshooting checklists, and step-by-step workflows. Articles here are written by the team and updated with every release.', '#14b8a6');
