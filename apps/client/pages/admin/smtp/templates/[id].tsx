import { toast } from "@/shadcn/hooks/use-toast";
import { getCookie } from "cookies-next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const RichHtmlEditor = dynamic(() => import("../../../../components/RichHtmlEditor"), { 
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted-foreground">Loading rich text editor...</div>
});

export default function EmailTemplates() {
  const [template, setTemplate] = useState<any>();

  const router = useRouter();



  async function fetchTemplate() {
    await fetch(`/api/v1/ticket/template/${router.query.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getCookie("session")}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log(data);
          setTemplate(data.template[0].html);
        }
      });
  }

  async function updateTemplate() {
    await fetch(`/api/v1/ticket/template/${router.query.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getCookie("session")}`,
      },
      body: JSON.stringify({ html: template }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          toast({
            variant: "default",
            title: "Success",
            description: `Template updated`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "API Error",
            description: data.message || "Template update failed",
          });
        }
      })
      .catch((error) => {
        console.error("Update failed:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      });
  }

  useEffect(() => {
    if (router.query.id) {
      fetchTemplate();
    }
  }, [router.query.id]);

  return (
    <div>
      <div>
        <button
          type="button"
          onClick={updateTemplate}
          className="rounded-md bg-green-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        >
          Update Template
        </button>
      </div>
      <div className="flex flex-col mt-4">
        {template !== undefined && (
          <RichHtmlEditor
            initialHtml={template}
            onChange={(html) => setTemplate(html)}
          />
        )}
      </div>
    </div>
  );
}
