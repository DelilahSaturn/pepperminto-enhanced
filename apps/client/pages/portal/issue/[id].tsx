import dynamic from "next/dynamic";

const TicketDetails = dynamic(() => import("../../../components/TicketDetails"), {
  ssr: false,
});

export default function PortalTicketByID() {
  return <TicketDetails variant="portal" />;
}

