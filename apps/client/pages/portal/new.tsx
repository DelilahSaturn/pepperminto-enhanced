// Check if the ID matches the id of the company
// If true then show ticket creation htmlForm else show access denied htmlForm
// API post request to creating a ticket with relevant client info
// Default to unassigned engineer
// Send Email to customer with ticket creation
// Send Email to Engineers with ticket creation if email notifications are turned on

import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { useUser } from "../../store/session";
import { getCookie } from "cookies-next";
import { toast } from "@/shadcn/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { Card } from "@/shadcn/ui/card";
import { Label } from "@/shadcn/ui/label";
import { Input } from "@/shadcn/ui/input";
import { Textarea } from "@/shadcn/ui/textarea";
import { Button } from "@/shadcn/ui/button";
import { LoaderCircle, Paperclip } from "lucide-react";

const type = [
  { id: 5, name: "Incident" },
  { id: 1, name: "Service" },
  { id: 2, name: "Feature" },
  { id: 3, name: "Bug" },
  { id: 4, name: "Maintenance" },
  { id: 6, name: "Access" },
  { id: 8, name: "Feedback" },
];

const pri = [
  { id: 7, name: "Low" },
  { id: 8, name: "Medium" },
  { id: 9, name: "High" },
];

export default function ClientTicketNew() {
  const { user } = useUser();

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState("new");
  const [ticketID, setTicketID] = useState("");

  const [selectedType, setSelectedType] = useState(type[2]?.name ?? "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(pri[0]?.name ?? "");
   const [files, setFiles] = useState<File[]>([]);
   const [isUploading, setIsUploading] = useState(false);
   const fileInputRef = useRef<HTMLInputElement | null>(null);

   const token = getCookie("session");

   const onAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files) return;
     const incoming = Array.from(e.target.files);
     const maxBytes = 10 * 1024 * 1024;

     const accepted: File[] = [];
     for (const file of incoming) {
       const isVideo =
         typeof file.type === "string" && file.type.startsWith("video/");
       if (!isVideo && file.size > maxBytes) {
         toast({
           variant: "destructive",
           title: "File too large",
           description: "Maximum file size is 10 MB for attachments.",
         });
         continue;
       }
       accepted.push(file);
     }

     if (!accepted.length) {
       e.target.value = "";
       return;
     }

     setFiles((prev) => [...prev, ...accepted]);
     e.target.value = "";
   };

   const removeFile = (idx: number) => {
     setFiles((prev) => prev.filter((_, i) => i !== idx));
   };

   async function uploadAttachments(ticketId: string) {
     if (!files.length) return;
     if (!token) return;

     setIsUploading(true);
     try {
       for (const file of files) {
         const formData = new FormData();
         formData.append("file", file);
         const res = await fetch(
           `/api/v1/storage/ticket/${ticketId}/upload/single`,
           {
             method: "POST",
             body: formData,
             headers: {
               Authorization: `Bearer ${token}`,
             },
           }
         );
         const data = await res.json().catch(() => null);
         if (!res.ok || !data?.success) continue;
       }
       setFiles([]);
     } finally {
       setIsUploading(false);
     }
   }

  async function submitTicket() {
    setIsLoading(true);
    await fetch(`/api/v1/ticket/create`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      body: JSON.stringify({
        name: user.name,
        title: subject,
        email: user.email,
        detail: description,
        priority,
        type: selectedType,
        createdBy: {
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email,
        },
      }),
    })
      .then((res) => res.json())
      .then(async (res) => {
        if (res.success) {
          toast({
            variant: "default",
            title: "Ticket created",
            description: "Ticket created successfully",
          });
          setView("success");
          setTicketID(res.id);

          await uploadAttachments(res.id);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please fill out all information and try again",
          });
        }
      });
    setIsLoading(false);
  }

  return (
    <div className="flex justify-center items-center content-center min-h-screen bg-background">
      {view === "new" ? (
        <Card
          className="max-w-2xl w-full border-border/60 bg-card/80 p-10 shadow-lg backdrop-blur"
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = Array.from(e.dataTransfer?.files || []);
            if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
          }}
        >
          <h1 className="font-bold text-2xl text-foreground">Submit a Ticket</h1>
          <span className="text-sm text-muted-foreground">
            Need help? Submit a ticket and our support team will get back to you
            as soon as possible.
          </span>

          <div className="my-6 flex flex-col space-y-4">
            <div>
              <Label htmlFor="subject" className="text-sm text-foreground">
                Subject
              </Label>
              <div className="mt-2">
                <Input
                  type="text"
                  name="subject"
                  id="subject"
                  className="bg-background/60"
                  placeholder="I can't login to my account"
                  onChange={(e) => setSubject(e.target.value)}
                  value={subject}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-foreground">Issue Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="mt-2 bg-background/60">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {type.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-2 bg-background/60">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {pri.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="comment" className="text-sm text-foreground">
                Description of Issue
              </Label>
              <div className="mt-2">
                <Textarea
                  rows={4}
                  name="comment"
                  id="comment"
                  className="bg-background/60"
                  defaultValue={""}
                  placeholder="I think I locked myself out!"
                  onChange={(e) => setDescription(e.target.value)}
                  value={description}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Attachments</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  className="hidden"
                  id="portal-ticket-attachments"
                  multiple
                  onChange={onAddFiles}
                  disabled={isLoading || isUploading}
                  ref={fileInputRef}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading || isUploading}
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  Add files
                </Button>
                <span className="text-xs text-muted-foreground">
                  Files will be attached after ticket creation.
                </span>
              </div>
              {files.length > 0 && (
                <div className="flex flex-col gap-1">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(idx)}
                        disabled={isLoading || isUploading}
                        aria-label="Remove file"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={submitTicket}
              disabled={isLoading || isUploading}
              className="self-start"
            >
              Submit Ticket
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="rounded-md bg-green-600 shadow-md p-12">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon
                  className="h-10 w-10 text-white"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <h3 className="text-4xl font-medium text-white">
                  Ticket Submitted
                </h3>
                <div className="mt-2 text-sm text-white">
                  <p>
                    A member of our team has been notified and will be in touch
                    shortly.
                  </p>
                </div>
                {/* <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <Link
                      href={`/portal/${router.query.id}/ticket/${ticketID}`}
                      className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                    >
                      View status
                    </Link>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
