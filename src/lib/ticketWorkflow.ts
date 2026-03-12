import { TicketStatus } from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.ASSIGNED, TicketStatus.CLOSED],
  ASSIGNED: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN],
  IN_PROGRESS: [TicketStatus.COMPLETED, TicketStatus.ON_HOLD, TicketStatus.ASSIGNED],
  ON_HOLD: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  COMPLETED: [TicketStatus.VERIFIED, TicketStatus.IN_PROGRESS],
  VERIFIED: [TicketStatus.CLOSED],
  CLOSED: [TicketStatus.OPEN],
};

export function isTransitionAllowed(current: TicketStatus, next: TicketStatus) {
  if (current === next) return true;
  const allowedNext = ALLOWED_TRANSITIONS[current] || [];
  return allowedNext.includes(next);
}

export function buildStatusTimestamps(status: TicketStatus, now: Date) {
  const timestamps: Record<string, Date> = {};

  switch (status) {
    case TicketStatus.ASSIGNED:
      timestamps.acknowledgedAt = now;
      break;
    case TicketStatus.IN_PROGRESS:
      timestamps.startedAt = now;
      break;
    case TicketStatus.COMPLETED:
      timestamps.completedAt = now;
      break;
    case TicketStatus.VERIFIED:
      timestamps.verifiedAt = now;
      break;
    case TicketStatus.CLOSED:
      timestamps.closedAt = now;
      break;
  }

  return timestamps;
}
