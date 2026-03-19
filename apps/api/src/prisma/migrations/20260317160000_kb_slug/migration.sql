-- Add slug to knowledgeBase (required by API + public KB app)
ALTER TABLE "knowledgeBase" ADD COLUMN "slug" TEXT;

-- Backfill existing rows with a deterministic unique slug
UPDATE "knowledgeBase"
SET "slug" = LOWER(REGEXP_REPLACE(TRIM("title"), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || "id"
WHERE "slug" IS NULL;

-- Enforce not-null + uniqueness
ALTER TABLE "knowledgeBase" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "knowledgeBase_slug_key" ON "knowledgeBase"("slug");

