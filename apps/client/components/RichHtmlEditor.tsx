"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Code
} from "lucide-react";

export default function RichHtmlEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml || "");
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (editorRef.current && html !== editorRef.current.innerHTML && !showCode) {
      editorRef.current.innerHTML = html;
    }
  }, [html, showCode]);

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setHtml(newHtml);
      onChange(newHtml);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setHtml(newHtml);
      onChange(newHtml);
    }
  };

  const addImage = () => {
    const url = prompt("Enter image URL:");
    if (url) exec("insertImage", url);
  };

  const addLink = () => {
    const url = prompt("Enter link URL:");
    if (url) exec("createLink", url);
  };

  return (
    <div className="border border-border/60 rounded-md bg-background/60 overflow-hidden flex flex-col min-h-[500px]">
      <div className="flex items-center gap-1 border-b border-border/60 p-2 bg-muted/40 flex-wrap">
        <button type="button" onClick={() => exec("bold")} className="p-1.5 hover:bg-muted rounded text-foreground" title="Bold">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => exec("italic")} className="p-1.5 hover:bg-muted rounded text-foreground" title="Italic">
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => exec("underline")} className="p-1.5 hover:bg-muted rounded text-foreground" title="Underline">
          <Underline size={16} />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => exec("insertUnorderedList")} className="p-1.5 hover:bg-muted rounded text-foreground" title="Bullet List">
          <List size={16} />
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className="p-1.5 hover:bg-muted rounded text-foreground" title="Numbered List">
          <ListOrdered size={16} />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={addImage} className="p-1.5 hover:bg-muted rounded text-foreground" title="Image">
          <ImageIcon size={16} />
        </button>
        <button type="button" onClick={addLink} className="p-1.5 hover:bg-muted rounded text-foreground" title="Link">
          <LinkIcon size={16} />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => setShowCode(!showCode)} className={`p-1.5 rounded flex items-center gap-1 ${showCode ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`} title="Toggle Code View">
          <Code size={16} />
          <span className="text-xs font-medium px-1">Source</span>
        </button>
      </div>

      <div className="flex-1 p-0 relative min-h-[440px]">
        {showCode ? (
          <textarea
            className="absolute inset-0 w-full h-full p-4 resize-none bg-background focus:outline-none font-mono text-sm border-none"
            value={html}
            onChange={(e) => {
              setHtml(e.target.value);
              onChange(e.target.value);
            }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            className="absolute inset-0 w-full h-full p-4 overflow-y-auto focus:outline-none prose prose-sm dark:prose-invert max-w-none"
            style={{ outline: "none", minHeight: "100%" }}
            dangerouslySetInnerHTML={{ __html: initialHtml }}
          />
        )}
      </div>
    </div>
  );
}
