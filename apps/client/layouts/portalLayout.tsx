import Link from "next/link";
import { useRouter } from "next/router";

import { AccountDropdown } from "../components/AccountDropdown";
import { useUser } from "../store/session";

import { PortalSidebar } from "@/shadcn/components/portal-sidebar";
import { CommandMenu } from "@/shadcn/components/command-menu";
import { ThemeToggle } from "@/shadcn/components/theme-toggle";
import { Button } from "@/shadcn/ui/button";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/shadcn/ui/sidebar";
import { Bell } from "lucide-react";
import CreateTicketModal from "../components/CreateTicketModal";
import { useState, useEffect } from "react";

export default function PortalLayout({ children }: any) {
  const location = useRouter();

  const { loading, user } = useUser();

  const [keypressdown, setKeyPressDown] = useState(false);

  function handleKeyPress(event: any) {
    const pathname = location.pathname;

    if (event.ctrlKey || event.metaKey) {
      return;
    }

    if (
      document.activeElement!.tagName !== "INPUT" &&
      document.activeElement!.tagName !== "TEXTAREA" &&
      !document.activeElement!.className.includes("ProseMirror") &&
      !pathname.includes("/new")
    ) {
      switch (event.key) {
        case "c":
          setKeyPressDown(true);
          break;
        default:
          break;
      }
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress, location]);

  if (!user) {
    location.push("/auth/login");
  }

  return (
    !loading &&
    user && (
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-35" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_top,_hsl(var(--primary)/0.12),_transparent_60%)]" />
        <SidebarProvider>
          <div className="relative z-10 flex min-h-screen w-full">
            <PortalSidebar variant="floating" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-x-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur sm:gap-x-6">
                <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
                  <SidebarTrigger title="[" className="text-muted-foreground" />
                  <div className="hidden w-full items-center justify-start space-x-6 sm:flex">
                    <CommandMenu />
                  </div>

                  <div className="flex w-full items-center justify-end gap-x-2 lg:gap-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 rounded-md border border-border/60 bg-background/70 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-accent/50 hover:text-foreground"
                      asChild
                    >
                      <Link href="/portal/notifications">
                        <span className="relative flex items-center justify-center">
                          <Bell className="h-4 w-4" />
                          {user.notifcations?.filter(
                            (notification) => !notification.read
                          ).length > 0 && (
                            <svg
                              className="absolute bottom-6 left-6 h-2.5 w-2.5 animate-pulse fill-primary"
                              viewBox="0 0 6 6"
                              aria-hidden="true"
                            >
                              <circle cx={3} cy={3} r={3} />
                            </svg>
                          )}
                        </span>
                      </Link>
                    </Button>

                    <ThemeToggle />

                    <AccountDropdown />
                  </div>
                </div>
              </div>
              <main className="flex-1 min-h-0">{children}</main>
              <CreateTicketModal
                keypress={keypressdown}
                setKeyPressDown={setKeyPressDown}
              />
              <footer className="border-t bg-background px-4 py-3 text-xs text-muted-foreground">
                <span>Source available at </span>
                <Link
                  href="https://github.com/DelilahSaturn/pepperminto"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  github.com/DelilahSaturn/pepperminto
                </Link>
              </footer>
            </div>
          </div>
        </SidebarProvider>
      </div>
    )
  );
}
