
import { getCookie } from "cookies-next";
import moment from "moment";
import Link from "next/link";
import { useUser } from "../store/session";
import { Button } from "@/shadcn/ui/button";

export default function Tickets() {

  const token = getCookie("session");

  const { user, fetchUserProfile } = useUser();
  const ticketHrefBase = user?.external_user ? "/portal/issue" : "/issue";

  async function markasread(id) {
    await fetch(`/api/v1/user/notifcation/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json());
    await fetchUserProfile();
  }

  
  return (
    <div>
      <div className="flex flex-col">
        <div className="py-2 px-6 flex flex-row items-center justify-between bg-muted/40 border-b border-border/60">
          <span className="text-sm font-bold text-foreground">
            You have {user.notifcations.filter((e) => !e.read).length} unread
            notifcations
            {user.notifcations.length > 1 ? "'s" : ""}
          </span>
        </div>
        {user.notifcations.filter((e) => !e.read).length > 0 ? (
          user.notifcations
            .filter((e) => !e.read)
            .map((item) => {
              return (
                <Link key={item.id} href={`${ticketHrefBase}/${item.ticketId}`}>
                  <div className="flex flex-row w-full bg-card/80 border-b border-border/60 p-2 justify-between px-6 hover:bg-accent/40">
                    <div className="flex flex-row space-x-2 items-center">
                      <span className="text-xs font-semibold text-foreground">
                        {item.text}
                      </span>
                    </div>
                    <div className="flex flex-row space-x-3 items-center">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markasread(item.id);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        mark as read
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {moment(item.createdAt).format("DD/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <span className="block text-sm font-semibold text-foreground">
              You have no notifcations
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
