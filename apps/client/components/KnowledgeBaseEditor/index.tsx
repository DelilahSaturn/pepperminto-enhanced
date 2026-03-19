import { toast } from "@/shadcn/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shadcn/ui/dropdown-menu";
import { Checkbox } from "@/shadcn/ui/checkbox";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import { Textarea } from "@/shadcn/ui/textarea";
import { MarkdownEditor } from "../MarkdownEditor";
import MarkdownRenderer from "../MarkdownRenderer";
import { getCookie } from "cookies-next";
import { Ellipsis, Link2 } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { useUser } from "../../store/session";

function toCsv(tags: string[] | null | undefined) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function slugify(value: string) {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function KnowledgeBaseEditor({ kbBaseUrl: initialKbBaseUrl }: { kbBaseUrl?: string }) {
  const router = useRouter();
  const token = getCookie("session");
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | undefined>(undefined);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [body, setBody] = useState("");

  const [debouncedTitle] = useDebounce(title, 700);
  const [debouncedSlug] = useDebounce(slug, 700);
  const [debouncedAuthor] = useDebounce(author, 700);
  const [debouncedTags] = useDebounce(tags, 700);
  const [debouncedPublished] = useDebounce(published, 700);
  const [debouncedBody] = useDebounce(body, 700);

  async function fetchArticle() {
    setLoading(true);

    const res = await fetch(`/api/v1/knowledge-base/${router.query.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((r) => r.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Unable to load article",
      });
      setLoading(false);
      return;
    }

    const article = res.article;

    setTitle(article.title || "");
    setSlug(article.slug || "");
    setAuthor(article.author || "");
    setTags(toCsv(article.tags));
    setPublished(Boolean(article.public));
    setBody(article.content || "");
    setLoading(false);
  }

  async function updateArticle() {
    setSaving(true);

    const payload: any = {
      title: debouncedTitle,
      slug: debouncedSlug,
      author: debouncedAuthor,
      tags: debouncedTags,
      published: debouncedPublished,
      body: debouncedBody,
    };

    const res = await fetch(`/api/v1/knowledge-base/${router.query.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).then((r) => r.json());

    setSaving(false);
    setLastSaved(Date.now());

    if (res.status || res.success === false) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Unable to update",
      });
    }
  }

  async function deleteArticle() {
    if (window.confirm("Do you really want to delete this article?")) {
      await fetch(`/api/v1/knowledge-base/${router.query.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            router.push("/knowledge-base");
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: res.message,
            });
          }
        });
    }
  }

  useEffect(() => {
    if (!router.query.id) return;
    fetchArticle();
  }, [router.query.id]);

  useEffect(() => {
    if (
      !loading &&
      (debouncedTitle ||
        debouncedSlug ||
        debouncedAuthor ||
        debouncedTags ||
        debouncedBody ||
        debouncedPublished !== undefined)
    ) {
      updateArticle();
    }
  }, [
    debouncedTitle,
    debouncedSlug,
    debouncedAuthor,
    debouncedTags,
    debouncedBody,
    debouncedPublished,
    loading,
  ]);

  const isAdminRoute = router.pathname.startsWith("/admin");

  if (!isAdminRoute || !user?.isAdmin) {
    if (loading) {
      return <span>Loading content...</span>;
    }

    const kbBaseUrl = (initialKbBaseUrl || "").replace(/\/+$/, "");
    const publicUrl = kbBaseUrl && router.query.id ? `${kbBaseUrl}/articles/${slug || router.query.id}` : "";

    return (
      <main className="flex-1">
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-foreground">
                  {title || "Untitled article"}
                </h1>
                <div className="mt-2 text-sm text-muted-foreground">
                  {author ? <span>By {author}</span> : null}
                  {author && (tags || published !== undefined) ? (
                    <span className="mx-2">•</span>
                  ) : null}
                  {tags ? <span>{tags}</span> : null}
                  {tags && published !== undefined ? (
                    <span className="mx-2">•</span>
                  ) : null}
                  <span>{published ? "Published" : "Draft"}</span>
                </div>
              </div>
              {publicUrl && (
                <button
                  type="button"
                  title="Copy public link"
                  className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => {
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(publicUrl).then(() => {
                        toast({
                          title: "Link copied",
                          description: publicUrl,
                          duration: 3000,
                        });
                      }).catch((err) => {
                         toast({ title: "Failed to copy", description: String(err), variant: "destructive" });
                      });
                    } else {
                      toast({ title: "Public Link", description: publicUrl });
                    }
                  }}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Copy link
                </button>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-border/60 bg-background/50 p-5">
              <MarkdownRenderer markdown={body || ""} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return <span>Loading content...</span>;
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between py-2 px-6 space-x-4 mt-2">
        <div className="flex items-center gap-2 text-xs">
          {saving ? (
            <span>saving ....</span>
          ) : (
            <span className="cursor-pointer">
              last saved:{" "}
              {lastSaved ? moment(lastSaved).format("hh:mm:ss") : "—"}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {published ? "Published" : "Draft"}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="mr-6">
            <DropdownMenuItem
              className="hover:bg-red-600"
              onClick={() => deleteArticle()}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="m-h-[90vh] p-2 w-full flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm text-foreground">Title</Label>
              <Input
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setTitle(newTitle);
                  if (!slug || slug === slugify(title)) {
                    setSlug(slugify(newTitle));
                  }
                }}
                className="mt-2 bg-background/60"
              />
            </div>
            <div>
              <Label className="text-sm text-foreground">Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-2 bg-background/60"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm text-foreground">Author</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-2 bg-background/60"
              />
            </div>
            <div>
              <Label className="text-sm text-foreground">Tags (CSV)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-2 bg-background/60"
              />
            </div>
          </div>

          <Label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={published}
              onCheckedChange={(checked) => setPublished(Boolean(checked))}
            />
            Publish to public knowledge base
          </Label>

          <div className="rounded-md border border-border/60 bg-background/60 p-3">
            <MarkdownEditor
              value={body}
              onChange={setBody}
              placeholder="Write the article content here using markdown (headings, lists, **bold**, _italic_, `code`)..."
            />
          </div>
        </div>
      </div>
    </>
  );
}
