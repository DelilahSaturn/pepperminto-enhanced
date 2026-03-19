// @ts-nocheck
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/shadcn/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/shadcn/ui/context-menu";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { getCookie } from "cookies-next";
import moment from "moment";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import TicketDetailContent from "../TicketDetailContent";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";

import { toast } from "@/shadcn/hooks/use-toast";
import { hasAccess } from "@/shadcn/lib/hasAccess";
import { cn } from "@/shadcn/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn/ui/avatar";
import { Button } from "@/shadcn/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shadcn/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/shadcn/ui/popover";
import { Switch } from "@/shadcn/ui/switch";
import {
  CheckIcon,
  CircleCheck,
  CircleDotDashed,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  LifeBuoy,
  Loader,
  LoaderCircle,
  Lock,
  Paperclip,
  PanelTopClose,
  Play,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Trash2,
  Unlock,
} from "lucide-react";
import { useUser } from "../../store/session";
import { ClientCombo, IconCombo, UserCombo } from "../Combo";
import { useTicketActions } from "@/shadcn/hooks/useTicketActions";

const ticketStatusMap = [
  { id: 0, value: "hold", name: "Hold", icon: CircleDotDashed },
  { id: 1, value: "needs_support", name: "Needs Support", icon: LifeBuoy },
  { id: 2, value: "in_progress", name: "In Progress", icon: CircleDotDashed },
  { id: 3, value: "in_review", name: "In Review", icon: Loader },
  { id: 4, value: "done", name: "Done", icon: CircleCheck },
];

const getStatusDisplayName = (status?: string | null) => {
  if (!status) return "";
  const match = ticketStatusMap.find((s) => s.value === status);
  return match ? match.name : status;
};

const priorityOptions = [
  {
    id: "1",
    name: "Low",
    value: "low",
    icon: SignalLow,
  },
  {
    id: "2",
    name: "Medium",
    value: "medium",
    icon: SignalMedium,
  },
  {
    id: "1",
    name: "High",
    value: "high",
    icon: SignalHigh,
  },
];

export default function Ticket({ variant }: { variant?: "dashboard" | "portal" }) {
  const router = useRouter();
  const { t } = useTranslation("peppermint");
  const { theme } = useTheme();

  const rawToken = getCookie("session");
  const token = typeof rawToken === "string" ? rawToken : "";

  const { user } = useUser();

  const fetchTicketById = async () => {
    const id = router.query.id;
    const res = await fetch(`/api/v1/ticket/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    hasAccess(res);

    return res.json();
  };

  const { data, isLoading, isError, isSuccess, refetch } = useQuery({
    queryKey: ["fetchTickets", router.query.id],
    queryFn: fetchTicketById,
    // Automatically start fetching when we have an id + token,
    // and keep polling every 3s for new comments/changes.
    enabled: Boolean(router.query.id && token),
    refetchInterval: 3000,
  });

  const fetchTicketFiles = async () => {
    const id = router.query.id;
    const res = await fetch(`/api/v1/storage/ticket/${id}/files`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  };

  const { data: filesData, refetch: refetchFiles } = useQuery({
    queryKey: ["ticketFiles", router.query.id],
    queryFn: fetchTicketFiles,
    enabled: Boolean(router.query.id && token),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!router.query.id) return;
    refetch();
    refetchFiles();
  }, [router.query.id]);

  const [edit, setEdit] = useState(false);
  const [editTime, setTimeEdit] = useState(false);
  const [assignedEdit, setAssignedEdit] = useState(false);
  const [labelEdit, setLabelEdit] = useState(false);

  const [users, setUsers] = useState<any>();
  const [clients, setClients] = useState<any>();
  const [n, setN] = useState<any>();

  const [note, setNote] = useState<any>();
  const [issue, setIssue] = useState<any>();
  const [title, setTitle] = useState<any>();
  // const [uploaded, setUploaded] = useState<any>();
  const [priority, setPriority] = useState<any>();
  const [ticketStatus, setTicketStatus] = useState<any>();
  const [comment, setComment] = useState<any>();
  const [timeSpent, setTimeSpent] = useState<any>();
  const [timeReason, setTimeReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<
    { name: string; type: string; url: string }[]
  >([]);
  const [assignedClient, setAssignedClient] = useState<any>();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    filename?: string;
    mime?: string;
    size?: number;
    kind: "image" | "video";
  } | null>(null);

  const history = useRouter();

  const { id } = history.query;

  const { deleteTicket } = useTicketActions(String(token || ""), refetch);

  const isPortal = variant === "portal";

  async function update() {
    if (data && data.ticket && data.ticket.locked) return;

    const res = await fetch(`/api/v1/ticket/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id,
        detail: JSON.stringify(debouncedValue),
        note,
        title: debounceTitle,
        priority: priority?.value,
        status: ticketStatus?.value,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to update ticket",
      });
      return;
    }
    setEdit(false);
  }

  async function updateStatus() {
    if (data && data.ticket && data.ticket.locked) return;

    const res = await fetch(`/api/v1/ticket/status/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: !data.ticket.isComplete,
        id,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to update status",
      });
      return;
    }
    refetch();
  }

  async function hide(hidden) {
    if (data && data.ticket && data.ticket.locked) return;

    const res = await fetch(`/api/v1/ticket/status/hide`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        hidden,
        id,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to update visibility",
      });
      return;
    }
    refetch();
  }

  async function lock(locked) {
    const res = await fetch(`/api/v1/ticket/status/lock`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        locked,
        id,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to update lock status",
      });
      return;
    }
    refetch();
  }

  async function deleteIssue() {
    await fetch(`/api/v1/ticket/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          toast({
            variant: "default",
            title: "Issue Deleted",
            description: "The issue has been deleted",
          });
          router.push("/issues");
        }
      });
  }

  async function addComment(): Promise<boolean> {
    if (data && data.ticket && data.ticket.locked) return false;

    const text = String(comment || "").trim();
    if (!text) return true;

    const res = await fetch(`/api/v1/ticket/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        id,
        public: false,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to add comment",
      });
      return false;
    }
    refetch();
    return true;
  }

  async function deleteComment(id: string) {
    await fetch(`/api/v1/ticket/comment/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          refetch();
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete comment",
          });
        }
      });
  }

  async function addTime() {
    if (data && data.ticket && data.ticket.locked) return;

    await fetch(`/api/v1/time/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        time: timeSpent,
        ticket: id,
        title: timeReason,
        user: user.id,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setTimeEdit(false);
          refetch();
          toast({
            variant: "default",
            title: "Time Added",
            description: "Time has been added to the ticket",
          });
        }
      });
  }

  async function fetchUsers() {
    const res = await fetch(`/api/v1/users/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to fetch users",
      });
      return;
    }

    if (res.users) {
      setUsers(res.users);
    }
  }

  async function fetchClients() {
    const res = await fetch(`/api/v1/clients/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json());

    if (res?.success && Array.isArray(res.clients)) {
      setClients(res.clients);
      return;
    }

    // Don't hard-fail the ticket view if client list isn't available.
    setClients([]);
  }

  async function subscribe() {
    if (data && data.ticket && data.ticket.locked) return;

    const following = Array.isArray(data?.ticket?.following)
      ? (data.ticket.following as string[])
      : [];
    const isFollowing = following.includes(user.id);
    const action = isFollowing ? "unsubscribe" : "subscribe";

    const res = await fetch(`/api/v1/ticket/${action}/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || `Failed to ${action} to issue`,
      });
      return;
    }

    toast({
      title: isFollowing ? "Unsubscribed" : "Subscribed",
      description: isFollowing
        ? "You will no longer receive updates"
        : "You will now receive updates",
      duration: 3000,
    });

    refetch();
  }

  async function transferTicket() {
    if (data && data.ticket && data.ticket.locked) return;
    if (n === undefined) return;

    const res = await fetch(`/api/v1/ticket/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user: n ? n.id : undefined,
        id,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to transfer ticket",
      });
      return;
    }

    setAssignedEdit(false);
    refetch();
  }

  async function transferClient() {
    if (data && data.ticket && data.ticket.locked) return;
    if (assignedClient === undefined) return;

    const res = await fetch(`/api/v1/ticket/transfer/client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client: assignedClient ? assignedClient.id : undefined,
        id,
      }),
    }).then((res) => res.json());

    if (!res.success) {
      toast({
        variant: "destructive",
        title: "Error",
        description: res.message || "Failed to transfer client",
      });
      return;
    }

    setAssignedEdit(false);
    refetch();
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);

    const maxBytes = 10 * 1024 * 1024;
    const accepted: File[] = [];

    for (const candidate of incoming) {
      const isVideo =
        typeof candidate.type === "string" &&
        candidate.type.startsWith("video/");

      if (!isVideo && candidate.size > maxBytes) {
        const sizeMB = (candidate.size / (1024 * 1024)).toFixed(1);
        toast({
          variant: "destructive",
          title: "File too large",
          description: `"${candidate.name}" is ${sizeMB} MB. Maximum file size is 10 MB.`,
        });
        continue;
      }
      accepted.push(candidate);
    }

    if (accepted.length === 0) {
      e.target.value = "";
      return;
    }

    setFiles((prev) => [...prev, ...accepted]);
    e.target.value = "";
  };

  const handleUpload = async (): Promise<boolean> => {
    if (files.length === 0) return true;

    if (!token) {
      toast({
        variant: "destructive",
        title: "Not logged in",
        description: "Please log in again and retry the upload.",
      });
      setFiles([]);
      return false;
    }

    try {
      setIsUploading(true);
      const failed: File[] = [];

      for (const f of files) {
        const formData = new FormData();
        formData.append("file", f);

        const result = await fetch(
          `/api/v1/storage/ticket/${router.query.id}/upload/single`,
          {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await result.json().catch(() => null);
        if (!result.ok || !data?.success) {
          failed.push(f);
        }
      }

      if (failed.length > 0) {
        setFiles(failed);
        toast({
          variant: "destructive",
          title: "Some uploads failed",
          description: `${failed.length} attachment(s) could not be uploaded. Please retry.`,
        });
        return false;
      }

      setFiles([]);
      refetch();
      refetchFiles();
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload error",
        description: "An unexpected error occurred while uploading.",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const [enterToSend, setEnterToSend] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnterToSend(localStorage.getItem("ticket_enter_to_send") === "true");
  }, []);

  // When viewing a ticket, mark all notifications for this ticket as read
  useEffect(() => {
    if (!id || !token) return;
    const ticketId = String(id);
    fetch(`/api/v1/user/notifications/ticket/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ticketId }),
    }).catch(() => {
      // best-effort; ignore failures
    });
  }, [id, token]);

  useEffect(() => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    el.scrollTop = el.scrollHeight;
  }, [data?.ticket?.comments?.length, filesData?.files?.length]);

  useEffect(() => {
    // build preview URLs for pending attachments
    setPendingPreviews((prev) => {
      prev.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch {}
      });
      return [];
    });

    if (files.length === 0) return;

    const next = files.map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      url: URL.createObjectURL(f),
    }));
    setPendingPreviews(next);

    return () => {
      next.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch {}
      });
    };
  }, [files]);

  useEffect(() => {
    fetchUsers();
    fetchClients();
  }, []);

  useEffect(() => {
    transferTicket();
  }, [n]);

  useEffect(() => {
    transferClient();
  }, [assignedClient]);

  const [debouncedValue] = useDebounce(issue, 500);
  const [debounceTitle] = useDebounce(title, 500);

  useEffect(() => {
    update();
  }, [priority, ticketStatus, debounceTitle]);

  useEffect(() => {
    if (issue) {
      update();
    }
  }, [debouncedValue]);

  async function handleSend() {
    if (data && data.ticket && data.ticket.locked) return;
    const hasText = String(comment || "").trim().length > 0;
    const hasFiles = files.length > 0;
    if (!hasText && !hasFiles) return;

    // Send text first so it appears above attachments.
    if (hasText) {
      const ok = await addComment();
      if (!ok) return;
      setComment("");
    }

    if (hasFiles) {
      const ok = await handleUpload();
      if (!ok) return;
    }
  }

  // Rich text editor (BlockNote) disabled in this build.
  // Ticket details are shown in a read-only frame below.

  async function updateTicketStatus(e: any, ticket: any) {
    await fetch(`/api/v1/ticket/status/update`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: ticket.id, status: !ticket.isComplete }),
    })
      .then((res) => res.json())
      .then(() => {
        toast({
          title: ticket.isComplete ? "Issue re-opened" : "Issue closed",
          description: "The status of the issue has been updated.",
          duration: 3000,
        });
        refetch();
      });
  }

  // Add these new functions
  async function updateTicketAssignee(ticketId: string, user: any) {
    try {
      const response = await fetch(`/api/v1/ticket/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: user ? user.id : undefined,
          id: ticketId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update assignee");

      toast({
        title: "Assignee updated",
        description: `Transferred issue successfully`,
        duration: 3000,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignee",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

  async function updateTicketPriority(ticket: any, priority: string) {
    try {
      const response = await fetch(`/api/v1/ticket/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: ticket.id,
          detail: ticket.detail,
          note: ticket.note,
          title: ticket.title,
          priority: priority,
          status: ticket.status,
        }),
      }).then((res) => res.json());

      if (!response.success) throw new Error("Failed to update priority");

      toast({
        title: "Priority updated",
        description: `Ticket priority set to ${priority}`,
        duration: 3000,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

  const priorities = ["low", "medium", "high"];

  return (
    <div>
      {isLoading && (
        <div className="min-h-screen flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
          <h2> Loading data ... </h2>
          {/* <Spin /> */}
        </div>
      )}

      {isError && (
        <div className="min-h-screen flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold"> Error fetching data ... </h2>
        </div>
      )}

      {isSuccess && (
        <>
          <main className="flex-1 min-h-[90vh] py-8">
              <div className="mx-auto max-w-7xl w-full px-4 flex flex-col lg:flex-row justify-center">
                <div className="lg:border-r lg:pr-8 lg:w-2/3">
                  <div className="md:flex md:justify-between md:space-x-4 lg:border-b lg:pb-4">
                    <div className="w-full">
                      <div className="flex flex-row space-x-1">
                        <h1 className="text-2xl mt-[5px] font-bold text-foreground">
                          #{data.ticket.Number} -
                        </h1>
                        <input
                          type="text"
                          name="title"
                          id="title"
                          style={{ fontSize: "1.5rem" }}
                          className="border-none -mt-[1px] px-0 pl-0.5 w-3/4 truncated m block text-foreground bg-transparent font-bold focus:outline-none focus:ring-0 placeholder:text-primary sm:text-sm sm:leading-6"
                          value={title}
                          defaultValue={data.ticket.title}
                          onChange={(e) => setTitle(e.target.value)}
                          key={data.ticket.id}
                          disabled={data.ticket.locked}
                        />
                      </div>
                      <div className="mt-2 text-xs flex flex-row justify-between items-center space-x-1">
                        <div className="flex flex-row space-x-1 items-center">
                          {data.ticket.client && (
                            <div>
                              <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                {data.ticket.client.name}
                              </span>
                            </div>
                          )}
                          <div>
                            {!data.ticket.isComplete ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                  {t("open_issue")}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                  {t("closed_issue")}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                              {data.ticket.type}
                            </span>
                          </div>
                          {data.ticket.hidden && (
                            <div>
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                Hidden
                              </span>
                            </div>
                          )}
                          {data.ticket.locked && (
                            <div>
                              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                Locked
                              </span>
                            </div>
                          )}
                        </div>
                        {user.isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center px-2 py-1 text-xs font-medium text-foreground ring-none outline-none ">
                              <Ellipsis className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[160px]"
                            >
                              <DropdownMenuLabel>
                                <span>Issue Actions</span>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {data.ticket.hidden ? (
                                <DropdownMenuItem
                                  className="flex flex-row space-x-3 items-center"
                                  onClick={() => hide(false)}
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Show Issue</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="flex flex-row space-x-3 items-center"
                                  onClick={() => hide(true)}
                                >
                                  <EyeOff className="h-4 w-4" />
                                  <span>Hide Issue</span>
                                </DropdownMenuItem>
                              )}
                              {data.ticket.locked ? (
                                <DropdownMenuItem
                                  className="flex flex-row space-x-3 items-center"
                                  onClick={() => lock(false)}
                                >
                                  <Unlock className="h-4 w-4" />
                                  <span>Unlock Issue</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="flex flex-row space-x-3 items-center"
                                  onClick={() => lock(true)}
                                >
                                  <Lock className="h-4 w-4" />
                                  <span>Lock Issue</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="flex flex-row space-x-3 items-center transition-colors duration-200 focus:bg-red-500 focus:text-white"
                                onClick={() => deleteIssue()}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="">Delete Issue</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isPortal && <aside className="mt-4 lg:hidden">
                    <div className="border-b pb-1">
                      <div className="border-t pt-1">
                        <div className="flex flex-col sm:flex-row space-x-2">
                          <div className="ml-2">
                            {users && (
                              <UserCombo
                                value={users}
                                update={setN}
                                defaultName={
                                  data.ticket.assignedTo
                                    ? data.ticket.assignedTo.name
                                    : ""
                                }
                                disabled={data.ticket.locked}
                                placeholder="Assign User..."
                                hideInitial={false}
                                showIcon={true}
                              />
                            )}
                          </div>

                          <IconCombo
                            value={priorityOptions}
                            update={setPriority}
                            defaultName={
                              data.ticket.priority ? data.ticket.priority : ""
                            }
                            disabled={data.ticket.locked}
                            hideInitial={false}
                          />

                          <UserCombo
                            value={ticketStatusMap}
                            update={setTicketStatus}
                            defaultName={getStatusDisplayName(
                              data.ticket.status
                            )}
                            disabled={data.ticket.locked}
                            showIcon={true}
                            placeholder="Change Client..."
                            hideInitial={false}
                          />
                        </div>
                      </div>
                    </div>
                  </aside>}
                  <section
                    aria-labelledby="activity-title "
                    className="border-t mt-4"
                  >
                    <div className="p-2 flex flex-col space-y-1">
                      <div className="flex flex-row items-center justify-between">
                        <span id="activity-title" className="sr-only">
                          Activity
                        </span>

                        <div className="flex flex-row items-center space-x-2">
                          <Button
                            variant="ghost"
                            onClick={() => subscribe()}
                            size="sm"
                            className="flex items-center gap-1 group"
                          >
                            {Array.isArray(data?.ticket?.following) &&
                            (data.ticket.following as string[]).includes(
                              user.id
                            ) ? (
                              <>
                                <span className="text-xs group-hover:hidden">
                                  following
                                </span>
                                <span className="text-xs hidden group-hover:inline text-destructive">
                                  unsubscribe
                                </span>
                              </>
                            ) : (
                              <span className="text-xs">follow</span>
                            )}
                          </Button>

                          {Array.isArray(data.ticket.following) &&
                            (data.ticket.following as string[]).length > 0 && (
                              <div className="flex space-x-2">
                                <Popover>
                                  <PopoverTrigger>
                                    <PanelTopClose className="h-4 w-4" />
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <div className="flex flex-col space-y-1">
                                      <span className="text-xs">Followers</span>
                                      {Array.isArray(data.ticket.following) &&
                                        Array.isArray(users) &&
                                        (data.ticket.following as string[]).map(
                                          (follower: any) => {
                                            const userMatch = users.find(
                                              (u: any) =>
                                                u.id === follower &&
                                                (!data.ticket.assignedTo ||
                                                  u.id !==
                                                    data.ticket.assignedTo.id)
                                            );
                                            return userMatch ? (
                                              <div key={follower}>
                                                <span>{userMatch.name}</span>
                                              </div>
                                            ) : null;
                                          }
                                        )}

                                      {Array.isArray(data.ticket.following) &&
                                        (!Array.isArray(users) ||
                                          (data.ticket.following as string[]).filter(
                                            (follower: any) =>
                                              !data.ticket.assignedTo ||
                                              follower !==
                                                data.ticket.assignedTo.id
                                          ).length === 0) && (
                                          <span className="text-xs">
                                            This issue has no followers
                                          </span>
                                        )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                        </div>
                      </div>
                      <div>
                        <div className="flex flex-row items-center text-sm space-x-1">
                          {data.ticket.fromImap ? (
                            <>
                              <span className="font-bold">
                                {data.ticket.email}
                              </span>
                              <span>created via email at </span>
                              <span className="font-bold">
                                {moment(data.ticket.createdAt).format(
                                  "DD/MM/YYYY"
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              {data.ticket.createdBy ? (
                                <div className="flex flex-row space-x-1">
                                  <span>
                                    Created by
                                    <strong className="ml-1">
                                      {data.ticket.createdBy.name}
                                    </strong>{" "}
                                    at{" "}
                                  </span>
                                  <span className="">
                                    {moment(data.ticket.createdAt).format(
                                      "LLL"
                                    )}
                                  </span>
                                  {data.ticket.name && (
                                    <span>
                                      for <strong>{data.ticket.name}</strong>
                                    </span>
                                  )}
                                  {data.ticket.email && (
                                    <span>
                                      ( <strong>{data.ticket.email}</strong> )
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-row space-x-1">
                                  <span>Created at </span>
                                  <span className="">
                                    <strong>
                                      {moment(data.ticket.createdAt).format(
                                        "LLL"
                                      )}
                                    </strong>
                                    {data.ticket.client && (
                                      <span>
                                        for{" "}
                                        <strong>
                                          {data.ticket.client.name}
                                        </strong>
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="">
                        {/* Pinned: original ticket message */}
                        {data.ticket.detail && (
                          <div className="mb-3 rounded-xl border border-border/60 bg-card/70 px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                              <span className="font-medium">
                                {data.ticket.createdBy?.name ||
                                  data.ticket.email ||
                                  "Unknown"}
                              </span>
                              <span>•</span>
                              <span>
                                {moment(data.ticket.createdAt).format("LLL")}
                              </span>
                              <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">
                                Original message
                              </span>
                            </div>
                            <div className="text-sm leading-relaxed">
                              <TicketDetailContent
                                detail={data.ticket.detail}
                                fromImap={data.ticket.fromImap}
                                className="bg-transparent p-0"
                              />
                            </div>
                          </div>
                        )}
                        <div
                          className="space-y-3 max-h-[60vh] overflow-y-auto pr-1"
                          ref={messagesRef}
                        >
                          <ul role="list" className="space-y-3">
                          {(() => {
                            const comments = Array.isArray(data?.ticket?.comments)
                              ? data.ticket.comments
                              : [];
                            const files = Array.isArray(filesData?.files)
                              ? filesData.files
                              : [];

                            const isAttachmentOnlyComment = (text: any) => {
                              const s = String(text || "").trim();
                              if (!s) return false;
                              return /^(\s*(?:!\[[^\]]*\]\(\/api\/v1\/storage\/ticket-file\/[^)]+\)|\[[^\]]+\]\(\/api\/v1\/storage\/ticket-file\/[^)]+\))\s*(?:\n+|$))+$/m.test(
                                s
                              );
                            };

                            const items = [
                              ...comments
                                .filter((c: any) => !isAttachmentOnlyComment(c?.text))
                                .map((c: any) => ({
                                  kind: "comment",
                                  id: c.id,
                                  createdAt: c.createdAt,
                                  user: c.user,
                                  userId: c.userId,
                                  replyEmail: c.replyEmail,
                                  text: c.text,
                                  canDelete:
                                    user.isAdmin ||
                                    (c.user && c.userId === user.id),
                                })),
                              ...files.map((f: any) => ({
                                kind: "file",
                                id: f.id,
                                createdAt: f.createdAt,
                                user: f.user,
                                filename: f.filename,
                                mime: f.mime,
                                size: f.size,
                                url: f.url,
                              })),
                            ].sort(
                              (a: any, b: any) =>
                                new Date(a.createdAt).getTime() -
                                new Date(b.createdAt).getTime()
                            );

                            // Group attachments into the nearest comment so message + files appear as one bubble.
                            const usedFileIds = new Set<string>();
                            const fileItems = items.filter((i: any) => i.kind === "file");
                            const commentItems = items.filter((i: any) => i.kind === "comment");
                            const windowMs = 15_000;

                            const filesForComment = (comment: any) => {
                              const uid = comment.user?.id || comment.userId;
                              if (!uid) return [];
                              const t = new Date(comment.createdAt).getTime();
                              return fileItems
                                .filter((f: any) => {
                                  if (usedFileIds.has(f.id)) return false;
                                  const fuid = f.user?.id;
                                  if (!fuid || fuid !== uid) return false;
                                  const ft = new Date(f.createdAt).getTime();
                                  return Math.abs(ft - t) <= windowMs;
                                })
                                .sort(
                                  (a: any, b: any) =>
                                    new Date(a.createdAt).getTime() -
                                    new Date(b.createdAt).getTime()
                                );
                            };

                            const merged = items
                              .map((item: any) => {
                                if (item.kind === "comment") {
                                  const attachments = filesForComment(item);
                                  attachments.forEach((f: any) => usedFileIds.add(f.id));
                                  return { ...item, attachments };
                                }
                                return item;
                              })
                              .filter((item: any) => !(item.kind === "file" && usedFileIds.has(item.id)));

                            return merged.map((item: any) => {
                              // Messenger layout:
                              // - Support/internal users: external_user=false
                              // - Clients: external_user=true OR no user (email/unknown)
                              const isSupport =
                                Boolean(item.user) &&
                                item.user.external_user !== true;
                              const isClient = !isSupport;

                              // Alignment:
                              // - Dashboard: client left, support right
                              // - Portal: client right, support left
                              const alignClass = isPortal
                                ? isClient
                                  ? "justify-end"
                                  : "justify-start"
                                : isSupport
                                ? "justify-end"
                                : "justify-start";

                              // Colors:
                              // - Client: teal
                              // - Support: grey (both dashboards)
                              const bubbleClass = isSupport
                                ? "bg-muted text-foreground"
                                : "bg-teal-500 text-white";

                              const rawUserName =
                                (item.user && typeof item.user.name === "string"
                                  ? item.user.name
                                  : "") || "";
                              const cleanedUserName = rawUserName.trim();
                              const fallbackEmail =
                                (item.user &&
                                  typeof item.user.email === "string" &&
                                  item.user.email) ||
                                "";
                              const name =
                                cleanedUserName ||
                                fallbackEmail ||
                                item.replyEmail ||
                                "Unknown";

                              const avatarUrl = item.user?.image || "";
                              const avatarFallback = String(name).slice(0, 1);

                              return (
                                <li key={`${item.kind}-${item.id}`}>
                                  <div className={`flex ${alignClass}`}>
                                    <div className="flex items-end gap-2 max-w-[85%]">
                                      {alignClass === "justify-start" && (
                                        <Avatar className="w-6 h-6 shrink-0">
                                          <AvatarImage src={avatarUrl} />
                                          <AvatarFallback>
                                            {avatarFallback}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}

                                      <div
                                        className={`group relative rounded-2xl px-4 py-2 text-sm shadow-sm ${bubbleClass}`}
                                      >
                                        <div className="flex items-center gap-2 mb-1 opacity-80">
                                          <span className="text-xs font-medium">
                                            {name}
                                          </span>
                                          <span className="text-[11px]">
                                            {moment(item.createdAt).format(
                                              "LLL"
                                            )}
                                          </span>
                                        </div>

                                        {item.kind === "comment" ? (
                                          <>
                                            {item.canDelete && (
                                              <Trash2
                                                className="h-4 w-4 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                  deleteComment(item.id);
                                                }}
                                              />
                                            )}
                                            <div
                                              className="leading-relaxed"
                                              dangerouslySetInnerHTML={{
                                                __html: renderInlineMarkdown(
                                                  String(item.text || "")
                                                ),
                                              }}
                                            />
                                            {Array.isArray(item.attachments) &&
                                              item.attachments.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                  {item.attachments.map((att: any) => (
                                                    <div
                                                      key={att.id}
                                                      className="flex items-center gap-3"
                                                    >
                                                      {typeof att.mime === "string" &&
                                                      att.mime.startsWith("image/") ? (
                                                        <button
                                                          type="button"
                                                          className="shrink-0"
                                                          onClick={() =>
                                                            setPreviewAttachment({
                                                              url: att.url,
                                                              filename: att.filename,
                                                              mime: att.mime,
                                                              size: att.size,
                                                              kind: "image",
                                                            })
                                                          }
                                                        >
                                                          <img
                                                            src={att.url}
                                                            alt="image attachment"
                                                            className="max-w-[200px] h-auto rounded-md border border-border/60 object-contain cursor-zoom-in"
                                                          />
                                                        </button>
                                                      ) : typeof att.mime === "string" &&
                                                        att.mime.startsWith("video/") ? (
                                                        <div className="flex flex-col items-start gap-1">
                                                          <button
                                                            type="button"
                                                            className="shrink-0"
                                                            onClick={() =>
                                                              setPreviewAttachment({
                                                                url: att.url,
                                                                filename: att.filename,
                                                                mime: att.mime,
                                                                size: att.size,
                                                                kind: "video",
                                                              })
                                                            }
                                                          >
                                                            <div className="relative inline-block">
                                                              <video
                                                                src={att.url}
                                                                muted
                                                                playsInline
                                                                preload="metadata"
                                                                className="max-w-[200px] h-auto rounded-md border border-border/60 cursor-pointer"
                                                              />
                                                              <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md">
                                                                  <Play className="h-7 w-7 text-gray-600" />
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </button>
                                                          {att.filename && (
                                                            <div className="max-w-[200px] truncate text-xs font-medium opacity-90">
                                                              {att.filename}
                                                            </div>
                                                          )}
                                                        </div>
                                                      ) : (
                                                        <>
                                                          <div className="h-16 w-16 rounded-md border border-border/60 bg-background/50 flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                                                            FILE
                                                          </div>
                                                          <div className="min-w-0">
                                                            <div className="truncate font-medium text-xs">
                                                              {att.filename}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2">
                                                              <a
                                                                href={att.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-accent/40"
                                                                aria-label="Download"
                                                                title="Download"
                                                              >
                                                                <Download className="h-4 w-4" />
                                                              </a>
                                                              {typeof att.size ===
                                                                "number" && (
                                                                <span className="text-[11px] opacity-80">
                                                                  {Math.max(
                                                                    1,
                                                                    Math.round(
                                                                      att.size /
                                                                        1024
                                                                    )
                                                                  )}{" "}
                                                                  KB
                                                                </span>
                                                              )}
                                                            </div>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                          </>
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            {typeof item.mime === "string" &&
                                            item.mime.startsWith("image/") ? (
                      <div className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          className="shrink-0"
                          onClick={() =>
                            setPreviewAttachment({
                              url: item.url,
                              filename: item.filename,
                              mime: item.mime,
                              size: item.size,
                              kind: "image",
                            })
                          }
                        >
                          <img
                            src={item.url}
                            alt="image attachment"
                            className="max-w-[200px] h-auto rounded-md border border-border/60 object-contain cursor-zoom-in"
                          />
                        </button>
                      </div>
                                            ) : (
                                              <>
                                                {typeof item.mime === "string" &&
                                                item.mime.startsWith("video/") ? (
                                                  <div className="flex flex-col items-start gap-1">
                                                    <button
                                                      type="button"
                                                      className="shrink-0"
                                                      onClick={() =>
                                                        setPreviewAttachment({
                                                          url: item.url,
                                                          filename: item.filename,
                                                          mime: item.mime,
                                                          size: item.size,
                                                          kind: "video",
                                                        })
                                                      }
                                                    >
                                                      <div className="relative inline-block">
                                                        <video
                                                          src={item.url}
                                                          muted
                                                          playsInline
                                                          preload="metadata"
                                                          className="max-w-[200px] h-auto rounded-md border border-border/60 cursor-pointer"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md">
                                                            <Play className="h-7 w-7 text-gray-600" />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </button>
                                                    {item.filename && (
                                                      <div className="max-w-[200px] truncate text-xs font-medium opacity-90">
                                                        {item.filename}
                                                      </div>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="h-16 w-16 rounded-md border border-border/60 bg-background/50 flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                                                      FILE
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="truncate font-medium text-xs">
                                                        {item.filename}
                                                      </div>
                                                      <div className="mt-1 flex items-center gap-2">
                                                        <a
                                                          href={item.url}
                                                          target="_blank"
                                                          rel="noreferrer"
                                                          className="inline-flex items-center justify-center rounded-md p-1 hover:bg-accent/40"
                                                          aria-label="Download"
                                                          title="Download"
                                                        >
                                                          <Download className="h-4 w-4" />
                                                        </a>
                                                        {typeof item.size ===
                                                          "number" && (
                                                          <span className="text-[11px] opacity-80">
                                                            {Math.max(
                                                              1,
                                                              Math.round(
                                                                item.size / 1024
                                                              )
                                                            )}{" "}
                                                            KB
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {alignClass === "justify-end" && (
                                        <Avatar className="w-6 h-6 shrink-0">
                                          <AvatarImage src={avatarUrl} />
                                          <AvatarFallback>
                                            {avatarFallback}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            });
                          })()}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="flex space-x-3">
                          <div className="min-w-0 flex-1">
                            <div>
                              <div>
                                <label htmlFor="message" className="sr-only">
                                  Message
                                </label>
                                {pendingPreviews.length > 0 && (
                                  <div className="mb-3 flex flex-wrap gap-2">
                                    {pendingPreviews.map((p) => {
                                      const isImg = p.type.startsWith("image/");
                                      const isVid = p.type.startsWith("video/");
                                      const showName = !isImg;
                                      return (
                                        <div
                                          key={`${p.name}-${p.url}`}
                                          className="relative flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 p-2"
                                        >
                                          {isImg ? (
                                            <img
                                              src={p.url}
                                              alt={p.name}
                                              className="h-12 w-12 rounded object-cover"
                                            />
                                          ) : isVid ? (
                                            <div className="relative h-12 w-16 overflow-hidden rounded bg-black">
                                              <video
                                                src={p.url}
                                                muted
                                                playsInline
                                                className="h-full w-full object-cover opacity-90"
                                              />
                                              <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                                                  <Play className="h-4 w-4 text-gray-700" />
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="h-12 w-12 rounded bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground">
                                              FILE
                                            </div>
                                          )}

                                          {showName && (
                                            <div className="max-w-[180px]">
                                              <div className="truncate text-xs font-medium">
                                                {p.name}
                                              </div>
                                            </div>
                                          )}

                                          <button
                                            type="button"
                                            className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background shadow border border-border/60 hover:bg-accent/50"
                                            onClick={() => {
                                              setFiles((prev) =>
                                                prev.filter((f) => f.name !== p.name)
                                              );
                                            }}
                                            aria-label="Remove attachment"
                                          >
                                            <span className="text-sm leading-none">
                                              ×
                                            </span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <textarea
                                  id="message"
                                  name="message"
                                  rows={3}
                                  className="block w-full bg-secondary/50 dark:bg-secondary/50 rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-background focus:ring-0 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                  placeholder={
                                    data.ticket.locked
                                      ? "This ticket is locked"
                                      : "Write a message"
                                  }
                                  onChange={(e) => setComment(e.target.value)}
                                  value={comment || ""}
                                  onKeyDown={(e) => {
                                    if (
                                      enterToSend &&
                                      e.key === "Enter" &&
                                      !e.shiftKey
                                    ) {
                                      e.preventDefault();
                                      if (
                                        !data.ticket.locked &&
                                        (comment || files.length > 0)
                                      ) {
                                        handleSend();
                                      }
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    if (data.ticket.locked) return;
                                    e.preventDefault();
                                  }}
                                  onDrop={(e) => {
                                    if (data.ticket.locked) return;
                                    e.preventDefault();
                                    const dropped = Array.from(
                                      e.dataTransfer?.files || []
                                    );
                                    if (dropped.length) {
                                      setFiles((prev) => [...prev, ...dropped]);
                                    }
                                  }}
                                  disabled={data.ticket.locked}
                                />
                              </div>

                              <div className="mt-4 flex items-center justify-end">
                                <div className="flex flex-row items-center space-x-2 text-xs text-muted-foreground">
                                  <Switch
                                    checked={enterToSend}
                                    onCheckedChange={(value) => {
                                      const v = Boolean(value);
                                      setEnterToSend(v);
                                      if (v) {
                                        localStorage.setItem(
                                          "ticket_enter_to_send",
                                          "true"
                                        );
                                      } else {
                                        localStorage.removeItem(
                                          "ticket_enter_to_send"
                                        );
                                      }
                                    }}
                                  />
                                  <span>Enter to send</span>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between space-x-4">
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    multiple
                                    disabled={data.ticket.locked || isUploading}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleButtonClick}
                                    disabled={data.ticket.locked || isUploading}
                                    className="gap-2"
                                  >
                                    {isUploading ? (
                                      <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Paperclip className="h-4 w-4" />
                                    )}
                                    Add files
                                  </Button>
                                  <span className="text-[11px] text-muted-foreground">
                                    Max 10 MB per file
                                  </span>
                                </div>
                                <div className="flex items-center justify-end space-x-4">
                                {data.ticket.isComplete ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!data.ticket.locked) {
                                        updateStatus();
                                      }
                                    }}
                                    disabled={data.ticket.locked}
                                    className={`inline-flex justify-center items-center gap-x-1.5 rounded-md ${
                                      data.ticket.locked
                                        ? "bg-muted cursor-not-allowed"
                                        : "bg-white hover:bg-gray-50"
                                    } px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300`}
                                  >
                                    <CheckCircleIcon
                                      className="-ml-0.5 h-5 w-5 text-red-500"
                                      aria-hidden="true"
                                    />
                                    <span className="">
                                      {t("reopen_issue")}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!data.ticket.locked) {
                                        updateStatus();
                                      }
                                    }}
                                    disabled={data.ticket.locked}
                                    className={`inline-flex justify-center gap-x-1.5 rounded-md ${
                                      data.ticket.locked
                                        ? "bg-muted cursor-not-allowed"
                                        : "bg-white hover:bg-gray-50"
                                    } px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300`}
                                  >
                                    <CheckCircleIcon
                                      className="-ml-0.5 h-5 w-5 text-green-500"
                                      aria-hidden="true"
                                    />
                                    {t("close_issue")}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (!data.ticket.locked && (comment || files.length > 0)) {
                                      handleSend();
                                    }
                                  }}
                                  type="submit"
                                  disabled={data.ticket.locked || (!comment && files.length === 0)}
                                  className={`inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
                                    data.ticket.locked
                                      ? "bg-gray-400 cursor-not-allowed"
                                      : "bg-gray-900 hover:bg-gray-700"
                                  }`}
                                >
                                  Send
                                </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attachments now render inline in the message stream above */}
                    </div>
                  </section>
                </div>
                <div className={`hidden lg:block lg:pl-8 lg:order-2 order-1 ${isPortal ? "opacity-60 pointer-events-none" : ""}`}>
                  <h2 className="sr-only">{t("details")}</h2>
                  <div className="space-y-1 py-2">
                    {Array.isArray(filesData?.files) &&
                      filesData.files.length > 0 && (
                        <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
                          <div className="text-sm font-semibold mb-2">
                            Attachments
                          </div>
                          <div className="flex flex-col gap-2">
                            {filesData.files.map((f: any) => (
                              <div
                                key={f.id}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline break-all"
                                >
                                  {f.filename}
                                </a>
                                {user.isAdmin && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-md p-1 hover:bg-accent/40"
                                    title="Delete attachment"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(
                                          `/api/v1/storage/ticket-file/${f.id}`,
                                          {
                                            method: "DELETE",
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          }
                                        );
                                        const data = await res
                                          .json()
                                          .catch(() => null);
                                        if (!res.ok || !data?.success) {
                                          toast({
                                            variant: "destructive",
                                            title: "Failed to delete attachment",
                                            description:
                                              data?.message ||
                                              "Unable to delete file.",
                                          });
                                        } else {
                                          toast({
                                            title: "Attachment removed",
                                            description:
                                              "The file has been deleted.",
                                          });
                                          refetchFiles();
                                          refetch();
                                        }
                                      } catch {
                                        toast({
                                          variant: "destructive",
                                          title: "Error",
                                          description:
                                            "Unexpected error deleting attachment.",
                                        });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    {users && (
                      <UserCombo
                        value={users}
                        update={setN}
                        defaultName={
                          data.ticket.assignedTo
                            ? data.ticket.assignedTo.name
                            : ""
                        }
                        disabled={data.ticket.locked}
                        showIcon={true}
                        placeholder="Change User..."
                        hideInitial={false}
                      />
                    )}
                    <IconCombo
                      value={priorityOptions}
                      update={setPriority}
                      defaultName={
                        data.ticket.priority ? data.ticket.priority : ""
                      }
                      disabled={data.ticket.locked}
                      hideInitial={false}
                    />
                    <IconCombo
                      value={ticketStatusMap}
                      update={setTicketStatus}
                      defaultName={data.ticket.status ? data.ticket.status : ""}
                      disabled={data.ticket.locked}
                      hideInitial={false}
                    />
                    {clients && (
                      <ClientCombo
                        value={clients}
                        update={setAssignedClient}
                        defaultName={
                          data.ticket.client
                            ? data.ticket.client.name
                            : "No Client Assigned"
                        }
                        disabled={data.ticket.locked}
                        showIcon={true}
                        hideInitial={false}
                      />
                    )}

                    {/* <div className="border-t border-gray-200">
                  <div className="flex flex-row items-center justify-between mt-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-white">
                      Time Tracking
                    </span>
                    {!editTime ? (
                      <button
                        onClick={() => setTimeEdit(true)}
                        className="text-sm font-medium text-gray-500 hover:underline dark:text-white"
                      >
                        add
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setTimeEdit(false);
                          addTime();
                        }}
                        className="text-sm font-medium text-gray-500 hover:underline dark:text-white"
                      >
                        save
                      </button>
                    )}
                  </div>
                  {data.ticket.TimeTracking.length > 0 ? (
                    data.ticket.TimeTracking.map((i: any) => (
                      <div key={i.id} className="text-xs">
                        <div className="flex flex-row space-x-1.5 items-center dark:text-white">
                          <span>{i.user.name} / </span>
                          <span>{i.time} minutes</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <span className="text-xs dark:text-white">
                        No Time added
                      </span>
                    </div>
                  )}
                  {editTime && (
                    <div>
                      <div className="mt-2 flex flex-col space-y-2">
                        <input
                          type="text"
                          name="text"
                          id="timespent_text"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          placeholder="What did you do?"
                          value={timeReason}
                          onChange={(e) => setTimeReason(e.target.value)}
                        />
                        <input
                          type="number"
                          name="number"
                          id="timespent"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          placeholder="Time in minutes"
                          value={timeSpent}
                          onChange={(e) => setTimeSpent(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div> */}
                    {/* <div className="border-t border-gray-200">
                  <div className="flex flex-row items-center justify-between mt-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-white">
                      Attachments
                    </span>
                    <button
                      className="text-sm font-medium text-gray-500 hover:underline dark:text-white"
                      onClick={handleButtonClick}
                    >
                      upload
                      <input
                        id="file"
                        type="file"
                        hidden
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                    </button>
                  </div>

                  <>
                    {data.ticket.files.length > 0 &&
                      data.ticket.files.map((file: any) => (
                        <div className="p-1/2 px-1  hover:bg-gray-200 hover:cursor-pointer">
                          <span className="text-xs">{file.filename}</span>
                        </div>
                      ))}
                    {file && (
                      <div className="p-1/2 px-1">
                        <span className="text-xs">{file.name}</span>
                      </div>
                    )}
                  </>
                </div> */}
                  </div>
                </div>
              </div>
            </main>

          {/* Image preview modal */}
          {previewAttachment && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setPreviewAttachment(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="relative max-h-[90vh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-background text-foreground shadow flex items-center justify-center"
                  onClick={() => setPreviewAttachment(null)}
                  aria-label="Close"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
                <div className="flex flex-col items-center gap-3">
                  {previewAttachment.kind === "video" ? (
                    <video
                      src={previewAttachment.url}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[85vh] max-w-[90vw] rounded-md bg-black"
                    />
                  ) : (
                    <img
                      src={previewAttachment.url}
                      alt={previewAttachment.filename || "image"}
                      className="max-h-[85vh] max-w-[90vw] rounded-md"
                    />
                  )}

                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <a
                      href={previewAttachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 hover:bg-white/20"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </a>
                    {typeof previewAttachment.size === "number" && (
                      <span className="opacity-80">
                        {Math.max(1, Math.round(previewAttachment.size / 1024))}{" "}
                        KB
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderInlineMarkdown(input: string) {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Render markdown images: ![alt](url)
  const withImages = escaped.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m, alt, url) => {
      const safeUrl = String(url).trim();
      if (!safeUrl.startsWith("/api/v1/storage/ticket-file/")) {
        return _m;
      }
      const safeAlt = String(alt || "");
      return `<img src="${safeUrl}" alt="${safeAlt}" class="max-w-full rounded-md border border-border/60 my-2" />`;
    }
  );

  // Render markdown links: [text](url) — allow any URL, not just storage
  const withMdLinks = withImages.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text, url) => {
      const safeUrl = String(url).trim();
      const safeText = String(text || "link");
      return `<a href="${safeUrl}" target="_blank" rel="noreferrer noopener" class="underline text-sky-600 dark:text-sky-400 hover:text-sky-500">${safeText}</a>`;
    }
  );

  // Convert newlines to <br> first, then process bare URLs
  const withBreaks = withMdLinks.replace(/\n/g, "<br />");

  // Embed YouTube videos (must run before generic URL linkification)
  const withYoutube = withBreaks.replace(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:[^\s<]*)/g,
    (_m, videoId) => {
      return `<div class="my-2"><iframe src="https://www.youtube.com/embed/${videoId}" class="w-full max-w-[480px] aspect-video rounded-lg border border-border/60" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );

  // Linkify remaining bare URLs that aren't already inside an href or src
  const withAutoLinks = withYoutube.replace(
    /(?<!href="|src="|href=&#039;|src=&#039;)(https?:\/\/[^\s<>"']+)/g,
    (url) => {
      let display = url;
      try {
        const parsed = new URL(url);
        display =
          parsed.hostname +
          (parsed.pathname !== "/" ? parsed.pathname : "") +
          parsed.search;
        if (display.length > 60) display = display.slice(0, 57) + "...";
      } catch {}
      return `<a href="${url}" target="_blank" rel="noreferrer noopener" class="underline text-sky-600 dark:text-sky-400 hover:text-sky-500">${display}</a>`;
    }
  );

  return withAutoLinks;
}
