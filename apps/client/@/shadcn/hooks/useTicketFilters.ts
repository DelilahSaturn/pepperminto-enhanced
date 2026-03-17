import { Ticket } from '@/shadcn/types/tickets';
import { useEffect, useState } from 'react';

export function useTicketFilters(tickets: Ticket[] = []) {
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(() => {
    const saved = localStorage.getItem("all_selectedPriorities");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get("filter");
      if (filter === "open" || filter === "closed") {
        return [filter];
      }
    }
    const saved = localStorage.getItem("all_selectedStatuses");
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get("filter");
      if (filter === "unassigned") {
        return ["Unassigned"];
      }
    }
    const saved = localStorage.getItem("all_selectedAssignees");
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem("all_selectedTypes");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("all_selectedPriorities", JSON.stringify(selectedPriorities));
    localStorage.setItem("all_selectedStatuses", JSON.stringify(selectedStatuses));
    localStorage.setItem("all_selectedAssignees", JSON.stringify(selectedAssignees));
    localStorage.setItem("all_selectedTypes", JSON.stringify(selectedTypes));
  }, [selectedPriorities, selectedStatuses, selectedAssignees, selectedTypes]);

  const handlePriorityToggle = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleAssigneeToggle = (assignee: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(assignee)
        ? prev.filter((a) => a !== assignee)
        : [...prev, assignee]
    );
  };

  const clearFilters = () => {
    setSelectedPriorities([]);
    setSelectedStatuses([]);
    setSelectedAssignees([]);
    setSelectedTypes([]);
  };

  const handleTypeToggle = (type: string) => {
    const normalized = type.toLowerCase();
    setSelectedTypes((prev) =>
      prev.includes(normalized)
        ? prev.filter((t) => t !== normalized)
        : [...prev, normalized]
    );
  };

  const filteredTickets = tickets.filter((ticket) => {
    const raw = (ticket.priority || "").toLowerCase();
    const ticketPriority = (raw === "normal" || raw === "medium" ? "medium" : raw);
    const priorityMatch =
      selectedPriorities.length === 0 ||
      selectedPriorities.some((p) => p.toLowerCase() === ticketPriority);
    const statusMatch =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(ticket.isComplete ? "closed" : "open");
    const assigneeMatch =
      selectedAssignees.length === 0 ||
      selectedAssignees.includes(ticket.assignedTo?.name || "Unassigned");

    const typeValue = (ticket.type || "").toLowerCase();
    const typeMatch =
      selectedTypes.length === 0 || selectedTypes.includes(typeValue);

    return priorityMatch && statusMatch && assigneeMatch && typeMatch;
  });

  return {
    selectedPriorities,
    selectedStatuses,
    selectedAssignees,
    selectedTypes,
    handlePriorityToggle,
    handleStatusToggle,
    handleAssigneeToggle,
    handleTypeToggle,
    clearFilters,
    filteredTickets
  };
}
