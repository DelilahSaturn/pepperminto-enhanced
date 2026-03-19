"use client";

import { useRef, useState } from "react";

type CreateTicketModalProps = {
  buttonClassName?: string;
};

type FormState = {
  name: string;
  email: string;
  title: string;
  detail: string;
  priority: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  title: "",
  detail: "",
  priority: "low",
};

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_DURATION_S = 60; // 1 minute

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateTicketModal({
  buttonClassName,
}: CreateTicketModalProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateFile(file: File): string | null {
    const isVideo =
      typeof file.type === "string" && file.type.startsWith("video/");

    if (!isVideo && file.size > MAX_FILE_SIZE) {
      return `"${file.name}" exceeds the ${formatBytes(MAX_FILE_SIZE)} file size limit (${formatBytes(file.size)}).`;
    }

    return null;
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const errors: string[] = [];
    const accepted: File[] = [];

    for (const file of incoming) {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
      } else {
        accepted.push(file);
      }
    }

    if (errors.length) setFileErrors(errors);
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function checkVideoDuration(file: File): Promise<string | null> {
    if (!file.type.startsWith("video/")) return Promise.resolve(null);
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION_S) {
          const mins = Math.ceil(video.duration / 60);
          resolve(
            `"${file.name}" is ${mins} min long. Maximum video length is ${MAX_VIDEO_DURATION_S / 60} minutes.`
          );
        } else {
          resolve(null);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      video.src = URL.createObjectURL(file);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessId(null);
    setFileErrors([]);

    // Validate video durations before submitting
    const videoErrors: string[] = [];
    for (const file of files) {
      const err = await checkVideoDuration(file);
      if (err) videoErrors.push(err);
    }
    if (videoErrors.length) {
      setFileErrors(videoErrors);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/ticket/public/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          title: form.title,
          detail: form.detail,
          priority: form.priority,
          type: "support",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create ticket.");
      }

      // Upload files using the guest upload token
      if (files.length > 0 && data.uploadToken && data.id) {
        const uploadErrors: string[] = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          try {
            const uploadRes = await fetch(
              `/api/v1/storage/public/ticket/${data.id}/upload/single`,
              {
                method: "POST",
                headers: { "x-upload-token": data.uploadToken },
                body: formData,
              }
            );
            const uploadData = await uploadRes.json().catch(() => null);
            if (!uploadRes.ok || !uploadData?.success) {
              uploadErrors.push(`Failed to upload "${file.name}".`);
            }
          } catch {
            uploadErrors.push(`Failed to upload "${file.name}".`);
          }
        }
        if (uploadErrors.length) {
          setFileErrors(uploadErrors);
        }
      }

      setSuccessId(data.id);
      setForm(initialState);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setError(null);
    setSuccessId(null);
    setFileErrors([]);
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          "mt-4 inline-flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        }
      >
        Create ticket
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
          <div
            className="absolute inset-0 bg-slate-950/50"
            onClick={closeModal}
          />
          <div className="fade-in-up relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-teal-700 dark:text-teal-300">
                  New ticket
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  Tell us what you need
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Name
                  <input
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Email
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                Title
                <input
                  required
                  maxLength={64}
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Brief summary of the issue"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                Details
                <textarea
                  required
                  rows={4}
                  value={form.detail}
                  onChange={(e) => updateField("detail", e.target.value)}
                  className={inputClass}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Priority
                  <select
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className={inputClass}
                  >
                    {priorities.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Attachments
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm transition hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:hover:border-teal-400 dark:hover:text-teal-300"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    Add files
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Max {formatBytes(MAX_FILE_SIZE)} per file. Videos up to{" "}
                    {MAX_VIDEO_DURATION_S / 60} min.
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="flex flex-col gap-1">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {f.name}{" "}
                        <span className="text-slate-400">
                          ({formatBytes(f.size)})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="ml-2 text-slate-400 hover:text-red-500"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {fileErrors.length > 0 && (
                <div className="space-y-1">
                  {fileErrors.map((msg, i) => (
                    <p
                      key={i}
                      className="text-sm text-red-600 dark:text-red-400"
                    >
                      {msg}
                    </p>
                  ))}
                </div>
              )}

              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : null}

              {successId ? (
                <p className="text-sm text-teal-700 dark:text-teal-300">
                  Ticket created! Reference: {successId}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
                >
                  {saving ? "Creating..." : "Create ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
