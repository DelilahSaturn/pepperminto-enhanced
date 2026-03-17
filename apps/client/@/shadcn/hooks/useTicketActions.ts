import { Ticket } from '@/shadcn/types/tickets';
import { toast } from "../hooks/use-toast";

export function useTicketActions(token: string, refetch: () => void) {
  const updateTicketStatus = async (ticket: Ticket) => {
    try {
      const response = await fetch(`/api/v1/ticket/status/update`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: ticket.id, status: !ticket.isComplete }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: ticket.isComplete ? "Issue re-opened" : "Issue closed",
        description: "The status of the issue has been updated.",
        duration: 3000,
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const updateTicketAssignee = async (ticketId: string, userId?: string) => {
    try {
      const response = await fetch(`/api/v1/ticket/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: userId,
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
  };

  const updateTicketPriority = async (ticket: Ticket, priority: string) => {
    try {
      // API uses "Normal" for middle priority; UI uses low, Medium, high only
      const apiPriority = priority.toLowerCase() === "medium" ? "Normal" : priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
      const displayPriority = priority.toLowerCase() === "medium" ? "Medium" : apiPriority;

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
          priority: apiPriority,
          status: ticket.status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update priority");

      toast({
        title: "Priority updated",
        description: `Ticket priority set to ${displayPriority}`,
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
  };

  const updateTicketWorkflowStatus = async (ticket: Ticket, status: string) => {
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
          priority: ticket.priority,
          status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "Status updated",
        description: `Ticket moved to ${status.replace("_", " ")}`,
        duration: 3000,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/v1/ticket/delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: ticketId }),
      });

      if (!response.ok) throw new Error("Failed to delete ticket");

      toast({
        title: "Ticket deleted",
        description: "The ticket has been deleted successfully",
        duration: 3000,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return {
    updateTicketStatus,
    updateTicketAssignee,
    updateTicketPriority,
    updateTicketWorkflowStatus,
    deleteTicket
  };
}
