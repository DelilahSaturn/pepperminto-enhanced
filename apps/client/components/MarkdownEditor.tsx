"use client";

import { useRef, useState } from "react";
import { Button } from "@/shadcn/ui/button";
import { Textarea } from "@/shadcn/ui/textarea";
import { cn } from "@/shadcn/lib/utils";
import MarkdownRenderer from "./MarkdownRenderer";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function applyWrap(prefix: string, suffix?: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const current = value || "";
    const before = current.slice(0, start);
    const selected = current.slice(start, end);
    const after = current.slice(end);
    const endSuffix = suffix ?? prefix;

    const next =
      before + prefix + (selected || "text") + endSuffix + after;
    onChange(next);

    // Restore selection roughly around inserted text
    const offset = prefix.length;
    const selStart = start + offset;
    const selEnd = selStart + (selected || "text").length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selStart, selEnd);
    });
  }

  function applyPrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const current = value || "";

    const lineStart = current.lastIndexOf("\n", start - 1) + 1;
    const before = current.slice(0, lineStart);
    const line = current.slice(lineStart);

    const next = before + prefix + line;
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  function renderPreview() {
    const raw = value || "";
    if (!raw.trim()) {
      return (
        <p className="text-xs text-muted-foreground">
          Nothing to preview yet. Start writing in markdown on the Write tab.
        </p>
      );
    }
    return (
      <MarkdownRenderer markdown={raw} />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between border-b border-border/60 pb-1">
        <div className="inline-flex rounded-md bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={cn(
              "px-2 py-1 rounded-sm",
              mode === "write" && "bg-background text-foreground shadow-sm"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "px-2 py-1 rounded-sm",
              mode === "preview" && "bg-background text-foreground shadow-sm"
            )}
          >
            Preview
          </button>
        </div>

        {mode === "write" && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>Markdown shortcuts:</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-xs"
              onClick={() => applyWrap("**")}
            >
              <strong>B</strong>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-xs italic"
              onClick={() => applyWrap("_")}
            >
              I
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-xs"
              onClick={() => applyWrap("`")}
            >
              {"</>"}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-xs"
              onClick={() => applyPrefix("- ")}
            >
              •
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[10px]"
              onClick={() => applyWrap("[", "](https://)")}
              title="Insert link"
            >
              link
            </Button>
            <span className="ml-1 text-[10px] text-muted-foreground/80">
              GitHub-flavored markdown (links, lists, tables, task lists, etc.).
            </span>
          </div>
        )}
      </div>

      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          className="min-h-[220px] bg-background/60"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="min-h-[220px] rounded-md border border-border/60 bg-background/40 p-3 overflow-auto">
          {renderPreview()}
        </div>
      )}
    </div>
  );
}

