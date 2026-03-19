import { toast } from "@/shadcn/hooks/use-toast";
import { getCookie } from "cookies-next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditClientPage() {
  const router = useRouter();
  const token = getCookie("session");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [copyingReset, setCopyingReset] = useState(false);

  const isEnabled =
    name.length > 0 && email.length > 0 && !!id;

  useEffect(() => {
    async function fetchClient() {
      if (!router.query.id) return;
      setLoading(true);
      const res = await fetch(`/api/v1/clients/all`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((r) => r.json());

      if (!res?.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: res?.message || "Unable to load client",
        });
        setLoading(false);
        return;
      }

      const client = (res.clients || []).find(
        (c: any) => c.id === router.query.id
      );
      if (!client) {
        toast({
          variant: "destructive",
          title: "Not found",
          description: "Client could not be found.",
        });
        setLoading(false);
        return;
      }

      setId(client.id);
      setName(client.name || "");
      setEmail(client.email || "");
      setContactMethod(
        client.number || client.contactName || ""
      );
      setLoading(false);
    }

    fetchClient();
  }, [router.query.id, token]);

  async function updateClient() {
    if (!id) return;
    setSaving(true);
    const res = await fetch(`/api/v1/client/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        id,
        name,
        email,
        number: contactMethod,
        contactName: contactMethod,
      }),
    }).then((r) => r.json());

    setSaving(false);

    if (res.success === true) {
      toast({
        variant: "default",
        title: "Success",
        description: "Client updated successfully",
      });
      router.push("/admin/clients");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Whoops! please wait and try again! 🤥",
      });
    }
  }

  async function sendPasswordReset() {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Missing email",
        description: "Client must have an email address to send a reset link.",
      });
      return;
    }
    setSendingReset(true);
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.BASE_URL || "";
      const link = `${origin}/auth/reset-password`;
      const res = await fetch(`/api/v1/auth/password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, link }),
      }).then((r) => r.json());

      if (res.success) {
        toast({
          variant: "default",
          title: "Password reset email sent",
          description: "The client will receive an email with reset instructions.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: res.message || "Unable to send reset email.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error sending reset email.",
      });
    } finally {
      setSendingReset(false);
    }
  }

  async function copyPasswordResetLink() {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Missing email",
        description: "Client must have an email address to generate a reset link.",
      });
      return;
    }
    setCopyingReset(true);
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.BASE_URL || "";
      const link = `${origin}/auth/reset-password`;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        toast({
          variant: "default",
          title: "Reset link copied",
          description: "The password reset link has been copied to your clipboard.",
        });
      } else {
        // Fallback for browsers that don't support navigator.clipboard
        try {
          const textarea = document.createElement("textarea");
          textarea.value = link;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textarea);

          if (successful) {
            toast({
              variant: "default",
              title: "Reset link copied",
              description: "The password reset link has been copied to your clipboard.",
            });
          } else {
            throw new Error("execCommand failed");
          }
        } catch {
          toast({
            variant: "destructive",
            title: "Unable to copy",
            description:
              "We couldn't access the clipboard. Please copy the link from the address bar instead.",
          });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error copying reset link.",
      });
    } finally {
      setCopyingReset(false);
    }
  }

  return (
    <div>
      <main className="flex-1">
        <div className="relative max-w-4xl mx-auto md:px-8 xl:px-0">
          <div className="pt-10 pb-16 divide-y-2">
            <div className="px-4 sm:px-6 md:px-0">
              <h1 className="text-3xl font-extrabold text-foreground">
                Edit client
              </h1>
            </div>
            <div className="py-4">
              {loading ? (
                <p className="text-sm text-muted-foreground px-4">
                  Loading client details...
                </p>
              ) : (
                <>
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                          <h3 className="text-lg leading-6 font-medium text-foreground">
                            Update client details
                          </h3>
                          <h3 className="text-xs font-normal text-foreground">
                            All fields are required.
                          </h3>
                          <div className="mt-2 space-y-4">
                            <input
                              type="text"
                              className="shadow-sm text-foreground bg-transparent focus:ring-indigo-500 focus:border-indigo-500 block w-3/4 sm:text-sm border-gray-300 rounded-md"
                              placeholder="Enter client name here..."
                              name="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />

                            <input
                              type="email"
                              className="shadow-sm text-foreground bg-transparent focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Enter email here...."
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />

                            <input
                              type="text"
                              className="shadow-sm  text-foreground bg-transparent focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Enter preferred contact method (e.g. phone, Discord, etc.) (optional)..."
                              value={contactMethod}
                              onChange={(e) => setContactMethod(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:items-center sm:justify-between">
                    <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
                      <button
                        type="button"
                        disabled={!isEnabled || saving}
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        onClick={updateClient}
                      >
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        type="button"
                        disabled={sendingReset || !email}
                        className="inline-flex justify-center rounded-md border border-primary/40 bg-background px-4 py-2 text-sm font-medium text-primary shadow-sm hover:bg-primary/10 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                        onClick={sendPasswordReset}
                      >
                        {sendingReset ? "Sending reset link..." : "Send password reset link"}
                      </button>
                      <button
                        type="button"
                        disabled={copyingReset || !email}
                        className="inline-flex justify-center rounded-md border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent/40 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                        onClick={copyPasswordResetLink}
                      >
                        {copyingReset ? "Copying..." : "Copy reset link"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

