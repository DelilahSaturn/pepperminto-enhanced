import {
  Building,
  ListPlus,
  Settings,
  SquareKanban,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/shadcn/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/shadcn/ui/sidebar";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../../store/session";

export function PortalSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const location = useRouter();

  const { loading, user } = useUser();
  const locale = user ? user.language : "en";

  const [keypressdown, setKeyPressDown] = useState(false);

  const { t } = useTranslation("peppermint");
  const sidebar = useSidebar();

  if (!user) {
    location.push("/auth/login");
  }

  const data = {
    teams: [
      {
        name: "Pepperminto",
        plan: "version: 0.1.3",
      },
    ],
    navMain: [
      {
        title: t("create_ticket"),
        url: ``,
        icon: ListPlus,
        isActive: location.pathname === "/portal/new",
        initial: "c",
      },
      {
        title: t("sl_dashboard"),
        url: `/${locale}/portal`,
        icon: Building,
        isActive:
          location.pathname === "/portal" ||
          location.pathname === `/${locale}/portal`,
        initial: "h",
      },
      {
        title: "Issues",
        url: `/${locale}/portal/issues`,
        icon: SquareKanban,
        isActive: location.pathname.startsWith("/portal/issues"),
        initial: "t",
        items: [
          {
            title: "Open",
            url: "/portal/issues/open",
            initial: "o",
          },
          {
            title: "Closed",
            url: "/portal/issues/closed",
            initial: "f",
          },
        ],
      },
    ],
  };

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
        case "h":
          location.push("/portal");
          break;
        case "t":
          location.push("/portal/issues");
          break;
        case "o":
          location.push("/portal/issues/open");
          break;
        case "f":
          location.push("/portal/issues/closed");
          break;
        case "[":
          sidebar.toggleSidebar();
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

  return (
    <Sidebar
      collapsible="icon"
      className="border border-sidebar-border/60 bg-sidebar/70 shadow-xl backdrop-blur"
      {...props}
    >
      <SidebarHeader className="rounded-lg border border-sidebar-border/60 bg-sidebar/80 p-3 shadow-sm group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary/15 text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8">
            <img src="/favicon/favicon-32x32.png" className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight text-foreground group-data-[collapsible=icon]:hidden">
            <span className="truncate text-lg font-semibold text-foreground">
              Pepperminto
            </span>
            <span className="truncate text-xs text-muted-foreground">
              version: 0.1.3
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}

