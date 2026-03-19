import Link from "next/link";
import { notFound } from "next/navigation";
import CreateTicketModal from "../../../components/create-ticket-modal";
import ThemeToggle from "../../../components/theme-toggle";
import { renderMarkdownToHtml } from "../../components/MarkdownRenderer";

export const dynamic = "force-dynamic";

const API_URL = process.env.API_URL || "http://localhost:3001";
const BASE_URL = process.env.BASE_URL || "https://pepperminto.dev";
const DASHBOARD_URL =
  process.env.DASHBOARD_URL || "https://dashboard.demo.pepperminto.dev";

type Branding = {
  siteName: string;
  title: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor: string;
};

async function getBranding(): Promise<Branding> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/knowledge-base/public/branding`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.branding) return data.branding;
    }
  } catch {}
  return {
    siteName: "Knowledge Base",
    title: "Help Center",
    accentColor: "#14b8a6",
  };
}

type Article = {
  title: string;
  slug: string;
  tags: string[];
  author: string;
  content: string;
  updatedAt: string;
  public?: boolean;
};

type BlockContent = {
  type?: string;
  text?: string;
  content?: BlockContent[];
};

type BlockNode = {
  type?: string;
  content?: BlockContent[];
  children?: BlockNode[];
};

async function getArticle(slug: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/knowledge-base/public/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.article as Article;
  } catch (error) {
    return null;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTags(tags: string[] | null | undefined) {
  return Array.isArray(tags) && tags.length > 0 ? tags.join(", ") : "";
}

function extractTextFromBlock(block: BlockNode): string {
  const contentText = (block.content || [])
    .map((child) => (child.text ? child.text : ""))
    .join("");
  const childText = (block.children || [])
    .map((child) => extractTextFromBlock(child))
    .join(" ");
  return [contentText, childText].filter(Boolean).join(" ");
}

function normalizeToMarkdown(raw: string) {
  if (!raw) return "";
  const trimmed = raw.trim();
  // legacy BlockNote JSON -> plain text markdown
  if (trimmed.startsWith("[")) {
    try {
      const blocks = JSON.parse(trimmed) as BlockNode[];
      return blocks
        .map((block) => extractTextFromBlock(block))
        .filter(Boolean)
        .join("\n\n");
    } catch (error) {
      return raw;
    }
  }
  return raw;
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, branding] = await Promise.all([getArticle(slug), getBranding()]);
  if (!article) {
    notFound();
  }

  const markdown = normalizeToMarkdown(article.content);
  const html = renderMarkdownToHtml(markdown || "");

  return (
    <div className="min-h-screen bg-grid text-slate-900 dark:text-slate-100">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-8 max-w-[160px] object-contain" />
          ) : (
            <span className="text-2xl">🍵</span>
          )}
          <span className="text-lg font-semibold tracking-wide">
            {branding.title}
          </span>
        </Link>
        <div className="hidden items-center gap-4 text-sm text-slate-400 md:flex">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white">
            Back to all articles
          </Link>
          <CreateTicketModal
            buttonClassName="rounded-full border border-slate-800/70 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-teal-500 hover:text-teal-200"
          />
          <Link href={BASE_URL} className="hover:text-slate-900 dark:hover:text-white">
            Main site
          </Link>
          <ThemeToggle />
        </div>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 md:px-8">
        <article className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">
              {article.title || "Untitled article"}
            </h1>
            <div className="mt-2 text-sm text-slate-400">
              {article.author ? <span>By {article.author}</span> : null}
              {article.author && (article.tags?.length || article.public !== undefined) ? (
                <span className="mx-2">•</span>
              ) : null}
              {formatTags(article.tags) ? <span>{formatTags(article.tags)}</span> : null}
              {formatTags(article.tags) && article.public !== undefined ? (
                <span className="mx-2">•</span>
              ) : null}
              <span>{article.public ? "Published" : "Draft"}</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800/70 bg-slate-950/40 p-5">
            <div
              className="prose prose-sm max-w-none dark:prose-invert prose-a:text-sky-600 dark:prose-a:text-sky-400"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </article>
      </main>
    </div>
  );
}
