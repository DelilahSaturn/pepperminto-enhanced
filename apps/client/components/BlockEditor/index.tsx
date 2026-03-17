import { Textarea } from "@/shadcn/ui/textarea";

export default function BlockNoteEditor({ setIssue }: { setIssue: (value: string) => void }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 p-2">
      <Textarea
        className="min-h-[180px] bg-transparent"
        placeholder="Describe the issue in detail..."
        onChange={(e) => setIssue(e.target.value)}
      />
    </div>
  );
}
