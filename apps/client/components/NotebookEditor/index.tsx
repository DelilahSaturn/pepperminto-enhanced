import { Textarea } from "@/shadcn/ui/textarea";
import { useEffect, useState } from "react";
import { getCookie } from "cookies-next";
import { useRouter } from "next/router";
import { toast } from "@/shadcn/hooks/use-toast";
import { useDebounce } from "use-debounce";

export default function NotebookEditor() {
  const router = useRouter();
  const token = getCookie("session");

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [debouncedContent] = useDebounce(content, 500);
  const [debouncedTitle] = useDebounce(title, 500);

  useEffect(() => {
    async function fetchNotebook() {
      if (!router.query.id) return;
      setLoading(true);
      const res = await fetch(`/api/v1/notebooks/note/${router.query.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((r) => r.json());

      if (res?.note) {
        setTitle(res.note.title || "");
        setContent(res.note.note || "");
      }
      setLoading(false);
    }
    fetchNotebook();
  }, [router.query.id, token]);

  useEffect(() => {
    async function save() {
      if (!router.query.id) return;
      setSaving(true);
      const res = await fetch(
        `/api/v1/notebooks/note/${router.query.id}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: debouncedTitle,
            content: debouncedContent,
          }),
        }
      ).then((r) => r.json());
      setSaving(false);
      if (res?.status) {
        toast({
          variant: "destructive",
          title: "Error -> Unable to update",
          description: res.message,
        });
      }
    }

    if (!loading && (debouncedContent !== undefined || debouncedTitle !== undefined)) {
      save();
    }
  }, [debouncedContent, debouncedTitle, loading, router.query.id, token]);

  if (loading) {
    return <span>Loading content...</span>;
  }

  return (
    <div className="m-h-[90vh] p-2 w-full flex justify-center">
      <div className="w-full max-w-2xl space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-3xl px-0 font-bold w-full border-none bg-transparent outline-none focus:ring-0 focus:outline-none"
        />
        <Textarea
          className="min-h-[50vh] bg-background/60"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your note..."
        />
        {saving && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
      </div>
    </div>
  );
}
