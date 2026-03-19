import { Button } from "@/shadcn/ui/button";
import { Input } from "@/shadcn/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/ui/select";
import { toast } from "@/shadcn/hooks/use-toast";
import { Link2 } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "../../store/session";

function groupArticlesByDate(articles) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return articles.reduce(
    (groups, article) => {
      const updatedAt = new Date(article.updatedAt);

      if (updatedAt.toDateString() === today.toDateString()) {
        groups.today.push(article);
      } else if (updatedAt.toDateString() === yesterday.toDateString()) {
        groups.yesterday.push(article);
      } else if (isThisWeek(updatedAt, today)) {
        groups.thisWeek.push(article);
      } else if (isThisMonth(updatedAt, today)) {
        groups.thisMonth.push(article);
      } else {
        groups.older.push(article);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    }
  );
}

function isThisWeek(date, today) {
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  return date >= weekStart;
}

function isThisMonth(date, today) {
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

async function fetchArticlesPublic(searchQuery: string) {
  const params = new URLSearchParams();
  if (searchQuery && searchQuery.trim().length > 0) {
    params.set("q", searchQuery.trim());
  }

  const res = await fetch(
    `/api/v1/knowledge-base/public?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  return res;
}

function getPreview(content: string) {
  if (!content) return "";
  let plain = content;
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("[")) {
      const blocks = JSON.parse(trimmed) as any[];
      const extract = (block: any): string => {
        const text = (block.content || [])
          .map((c: any) => (c.text ? c.text : ""))
          .join("");
        const children = (block.children || [])
          .map((child: any) => extract(child))
          .join(" ");
        return [text, children].filter(Boolean).join(" ");
      };
      plain = blocks.map(extract).join(" ");
    }
  } catch {
  }

  plain = plain.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= 160) return plain;
  return plain.slice(0, 157) + "...";
}

export async function getServerSideProps() {
  return {
    props: {
      kbBaseUrl: process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_URL || process.env.KNOWLEDGE_BASE_URL || "",
    },
  };
}

export default function KnowledgeBaseIndex({ kbBaseUrl }: { kbBaseUrl?: string }) {
  const { user } = useUser();
  const [sortBy, setSortBy] = useState("updatedAt");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["kbArticlesPublic", searchQuery],
    queryFn: () => fetchArticlesPublic(searchQuery),
  });

  const router = useRouter();

  const sortedAndFilteredArticles = (articles) => {
    if (!articles) return [];

    const sorted = [...articles].sort((a, b) => {
      const dateA = new Date(a[sortBy]);
      const dateB = new Date(b[sortBy]);
      return dateB.getTime() - dateA.getTime();
    });

    return sorted;
  };

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-foreground">
            Knowledge Base
          </h1>
          <div className="flex items-center w-full justify-center flex-row space-x-2 flex-1 mr-2">
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
                <SelectItem value="createdAt">Created Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="mt-8 w-full flex justify-center">
        {isLoading && <p>Loading...</p>}
        {data && data.articles && data.articles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No knowledge base entries found.
            </p>
          </div>
        ) : (
          <div className="flex flex-col w-full max-w-2xl justify-center space-y-4">
            {data?.articles &&
              Object.entries(
                groupArticlesByDate(
                  sortedAndFilteredArticles(data.articles)
                )
              ).map(
                ([period, articles]) =>
                  Array.isArray(articles) &&
                  articles.length > 0 && (
                    <div key={period} className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                        {period.replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      <div className="space-y-1">
                        {articles.map((item) => (
                          <button
                            key={item.id}
                            className="flex flex-row w-full justify-between items-center align-middle transition-colors"
                            onClick={() => router.push(`/knowledge-base/${item.id}`)}
                          >
                            <div className="flex flex-col text-left max-w-[520px]">
                              <h2 className="text-md font-semibold text-gray-900 dark:text-white">
                                {item.title}
                              </h2>
                              <span className="text-xs text-gray-500">
                                {item.public ? "Published" : "Draft"}
                              </span>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 text-left">
                                {getPreview(item.content || "")}
                              </p>
                            </div>
                            <div className="space-x-2 flex flex-row items-center">
                              <button
                                type="button"
                                title="Copy public link"
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const base = (kbBaseUrl || "").replace(/\/+$/, "");
                                  if (!base) {
                                    toast({ title: "Configuration Error", description: "KNOWLEDGE_BASE_URL is not set", variant: "destructive" });
                                    return;
                                  }
                                  
                                  const url = `${base}/articles/${item.slug || item.id}`;
                                  
                                  if (navigator.clipboard && window.isSecureContext) {
                                    navigator.clipboard.writeText(url).then(() => {
                                      toast({
                                        title: "Link copied",
                                        description: url,
                                        duration: 3000,
                                      });
                                    }).catch((err) => {
                                      toast({ title: "Failed to copy", description: String(err), variant: "destructive" });
                                    });
                                  } else {
                                    toast({ title: "Public Link", description: url });
                                  }
                                }}
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <span className="text-sm text-gray-500">
                                {new Date(item.updatedAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
              )}
          </div>
        )}
      </div>
    </div>
  );
}
