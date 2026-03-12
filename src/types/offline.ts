import type { TicketStatus } from "@prisma/client";
import type { ErrorResponse } from "@/lib/errors";

export type OfflineMutation = {
  id: string;
  type: "ticket_status_update";
  payload: {
    ticketId: string;
    status: TicketStatus;
    resolution?: string;
    expectedVersion?: number;
  };
  queuedAt: string;
};

export type OfflineSyncResult = {
  id: string;
  ok: boolean;
  error?: ErrorResponse;
};
