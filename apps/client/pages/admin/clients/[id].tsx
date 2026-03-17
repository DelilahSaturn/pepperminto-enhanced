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
  const [number, setNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const isEnabled =
    number.length > 0 &&
    contactName.length > 0 &&
    name.length > 0 &&
    email.length > 0 &&
    !!id;

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
      setContactName(client.contactName || "");
      setNumber(client.number || "");
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
        number,
        contactName,
        name,
        email,
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
                              className="shadow-sm text-foreground bg-transparent focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Enter client primary contact name here..."
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                            />

                            <input
                              type="text"
                              className="shadow-sm  text-foreground bg-transparent focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Enter client primary contact number here..."
                              value={number}
                              onChange={(e) => setNumber(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      disabled={!isEnabled || saving}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={updateClient}
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
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

