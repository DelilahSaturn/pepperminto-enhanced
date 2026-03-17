"use client";

import { useEffect, useState } from "react";

/**
 * Renders ticket.detail as HTML. If detail is BlockNote JSON (array of blocks),
 * converts it to HTML without importing BlockNote (avoids bundling tiptap in Docker).
 * Otherwise treats it as HTML (e.g. from IMAP) or plain text.
 */
export default function TicketDetailContent({
  detail,
  fromImap,
  className = "",
}: {
  detail: string | undefined;
  fromImap?: boolean;
  className?: string;
}) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (detail == null || detail === "") {
      setHtml("");
      return;
    }

    const trimmed = String(detail).trim();

    // If it looks like HTML (starts with <), use as-is
    if (trimmed.startsWith("<")) {
      setHtml(trimmed);
      return;
    }

    // Try parsing as BlockNote JSON (array of blocks) and render without BlockNote lib
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && "type" in parsed[0]) {
        setHtml(blockNoteBlocksToHtml(parsed));
        setError(false);
        return;
      }
    } catch {
      // Not JSON
    }

    // Plain text – escape and preserve newlines
    setHtml(escapeHtml(trimmed).replace(/\n/g, "<br />"));
  }, [detail]);

  if (error || (html === "" && detail)) {
    return (
      <div className={`break-words rounded-md text-black dark:text-gray-200 ${className}`}>
        <pre className="whitespace-pre-wrap text-sm p-2 bg-muted/30 rounded">
          {typeof detail === "string" ? detail : JSON.stringify(detail)}
        </pre>
      </div>
    );
  }

  if (!html) {
    return (
      <div className={`break-words rounded-md text-muted-foreground text-sm ${className}`}>
        No description.
      </div>
    );
  }

  return (
    <div
      className={`break-words rounded-md text-black dark:text-gray-200 prose prose-sm max-w-none dark:prose-invert prose-p:my-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Convert BlockNote-style blocks (array of { type, content?, children? }) to HTML
 * without using @blocknote/core so the client build does not pull in tiptap.
 */
function blockNoteBlocksToHtml(blocks: unknown[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    if (block && typeof block === "object" && "type" in block) {
      const b = block as { type?: string; content?: Array<{ text?: string }>; children?: unknown[] };
      const tag = blockTag(b.type);
      const text = getBlockText(b);
      if (b.children && Array.isArray(b.children) && b.children.length > 0) {
        const inner = blockNoteBlocksToHtml(b.children);
        out.push(`<${tag}>${text}<div class="pl-4 border-l-2 border-border/60 my-1">${inner}</div></${tag}>`);
      } else {
        out.push(`<${tag}>${text}</${tag}>`);
      }
    }
  }
  return out.join("");
}

function blockTag(type: string | undefined): string {
  switch (type) {
    case "heading":
      return "h3";
    case "blockquote":
      return "blockquote";
    default:
      return "p";
  }
}

function getBlockText(block: { content?: Array<{ text?: string }> }): string {
  const content = block.content;
  if (!Array.isArray(content)) return "";
  return content.map((c) => (c && typeof c.text === "string" ? escapeHtml(c.text) : "")).join("");
}

function escapeHtml(text: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
