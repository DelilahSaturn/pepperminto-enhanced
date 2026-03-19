import { getCookie } from "cookies-next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/shadcn/ui/button";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import { toast } from "@/shadcn/hooks/use-toast";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getCookie("session")}`,
});

async function fetchBranding() {
  const res = await fetch(`/api/v1/knowledge-base/public/branding`);
  const data = await res.json();
  return data.branding || null;
}

export default function KnowledgeBaseBranding() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [brandTitle, setBrandTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [accentColor, setAccentColor] = useState("#14b8a6");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBranding().then((b) => {
      if (!b) return;
      setSiteName(b.siteName || "");
      setBrandTitle(b.title || "");
      setSubtitle(b.subtitle || "");
      setAccentColor(b.accentColor || "#14b8a6");
      setLogoPreview(b.logoUrl || null);
      setFaviconPreview(b.faviconUrl || null);
    });
  }, []);

  const uploadFile = useCallback(async (field: "logo" | "favicon", file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/v1/knowledge-base/branding/upload/${field}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getCookie("session")}` },
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Upload failed");
    return data.url as string;
  }, []);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile("logo", file);
      setLogoPreview(url);
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    }
  }

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile("favicon", file);
      setFaviconPreview(url);
      toast({ title: "Favicon uploaded" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    }
  }

  async function saveBranding() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/knowledge-base/branding`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ siteName, title: brandTitle, subtitle, accentColor }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Branding saved" });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save branding" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex-1">
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">
              Knowledge Base Branding
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Customise how your public knowledge base looks to visitors.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/knowledge-base")}>
            Back to Articles
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-sm text-foreground">Site Name</Label>
                <Input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="mt-2 bg-background/60"
                  placeholder="Knowledge Base"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown in the browser tab title.
                </p>
              </div>
              <div>
                <Label className="text-sm text-foreground">Heading</Label>
                <Input
                  value={brandTitle}
                  onChange={(e) => setBrandTitle(e.target.value)}
                  className="mt-2 bg-background/60"
                  placeholder="Help Center"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Main heading displayed on the knowledge base.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-foreground">Subtitle</Label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
                placeholder="A short description shown below the heading..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Description text shown below the main heading on the knowledge base.
              </p>
            </div>

            <div>
              <Label className="text-sm text-foreground">Accent Color</Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="max-w-[140px] bg-background/60"
                  placeholder="#14b8a6"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-sm text-foreground">Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-10 w-10 rounded object-contain border border-border"
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
                    {logoPreview ? "Replace" : "Upload"}
                  </Button>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Replaces the default emoji in the header.
                </p>
              </div>

              <div>
                <Label className="text-sm text-foreground">Favicon</Label>
                <div className="mt-2 flex items-center gap-4">
                  {faviconPreview && (
                    <img
                      src={faviconPreview}
                      alt="Favicon preview"
                      className="h-10 w-10 rounded object-contain border border-border"
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={() => faviconRef.current?.click()}>
                    {faviconPreview ? "Replace" : "Upload"}
                  </Button>
                  <input
                    ref={faviconRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={handleFaviconChange}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Browser tab icon for the knowledge base.
                </p>
              </div>
            </div>

            <div>
              <Button onClick={saveBranding} disabled={saving}>
                {saving ? "Saving…" : "Save Branding"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
