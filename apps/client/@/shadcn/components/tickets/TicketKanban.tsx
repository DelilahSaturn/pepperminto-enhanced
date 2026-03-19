import moment from 'moment';
import Link from 'next/link';
import { useState } from 'react';
import { KanbanColumn, UISettings } from '../../types/tickets';

interface TicketKanbanProps {
  columns: KanbanColumn[];
  uiSettings: UISettings;
  onTicketMove?: (ticketId: string, targetColumnId: string) => void;
}

export default function TicketKanban({
  columns,
  uiSettings,
  onTicketMove,
}: TicketKanbanProps) {
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-hidden">
      <div className="flex h-full min-h-0 gap-4 p-4 pb-6 min-w-max w-max">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`w-[320px] flex-shrink-0 rounded-lg flex flex-col min-h-0 transition-colors ${
              dragOverColumnId === column.id
                ? "bg-primary/10 dark:bg-primary/20 ring-2 ring-primary"
                : "bg-gray-50 dark:bg-gray-800/50"
            }`}
            onDragEnter={() => setDragOverColumnId(column.id)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverColumnId(null);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragOverColumnId(null);
              const ticketId = event.dataTransfer.getData("text/plain");
              if (ticketId && onTicketMove) {
                onTicketMove(ticketId, column.id);
              }
            }}
          >
            <div className="p-3 border-b dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${column.color}`} />
                <span className="font-medium text-sm truncate">
                  {column.title}
                </span>
                <span className="text-gray-500 text-xs flex-shrink-0">
                  ({column.tickets.length})
                </span>
              </div>
            </div>
            <div className="min-h-0 p-2 space-y-2 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {column.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", ticket.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 p-3 cursor-move hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0 flex-1">
                        {uiSettings.showTicketNumbers && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            #{ticket.Number}
                          </span>
                        )}
                        <Link
                          href={`/issue/${ticket.id}`}
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {ticket.title}
                        </Link>
                      </div>
                      {uiSettings.showAvatars && ticket.assignedTo && (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 flex-shrink-0">
                          <span className="text-[11px] font-medium leading-none text-white uppercase">
                            {ticket.assignedTo.name[0]}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {uiSettings.showDates && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {moment(ticket.createdAt).format("DD/MM/yyyy")}
                        </span>
                      )}

                      {/* Status pill (open/closed) matching /issues/open & /issues/closed */}
                      {ticket.isComplete ? (
                        <span className="inline-flex items-center gap-x-1.5 rounded-md bg-red-100 px-2 justify-center py-1 text-xs ring-1 ring-inset ring-gray-500/10 font-medium text-red-700">
                          <svg
                            className="h-1.5 w-1.5 fill-red-500"
                            viewBox="0 0 6 6"
                            aria-hidden="true"
                          >
                            <circle cx={3} cy={3} r={3} />
                          </svg>
                          closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-x-1.5 rounded-md justify-center font-medium bg-green-100 ring-1 ring-inset ring-gray-500/10 px-2 py-1 text-xs text-green-700">
                          <svg
                            className="h-1.5 w-1.5 fill-green-500"
                            viewBox="0 0 6 6"
                            aria-hidden="true"
                          >
                            <circle cx={3} cy={3} r={3} />
                          </svg>
                          open
                        </span>
                      )}

                      {uiSettings.showType && (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize bg-orange-400 text-white flex-shrink-0">
                          {ticket.type}
                        </span>
                      )}

                      {uiSettings.showPriority && (() => {
                        const p = ticket.priority?.toLowerCase() ?? "";
                        const isMedium = p === "normal" || p === "medium";
                        const display = p === "low" ? "Low" : isMedium ? "Medium" : "High";
                        const color = p === "high" ? "bg-red-100 text-red-800" : isMedium ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
                        return (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize flex-shrink-0 ${color}`}>
                            {display}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
