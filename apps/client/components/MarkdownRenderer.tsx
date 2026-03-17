"use client";

import { useMemo } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

export function renderMarkdownToHtml(markdown: string): string {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeStringify, { allowDangerousHtml: false })
    .processSync(markdown || "");
  return String(file);
}

export default function MarkdownRenderer({ markdown }: { markdown: string }) {
  const html = useMemo(() => renderMarkdownToHtml(markdown), [markdown]);
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert prose-a:text-sky-600 dark:prose-a:text-sky-400"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

