import { TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; variant: string; icon: string }
> = {
  OPEN: { label: "Open", variant: "open", icon: "circle-dot" },
  ASSIGNED: { label: "Assigned", variant: "assigned", icon: "user-check" },
  IN_PROGRESS: { label: "In Progress", variant: "inProgress", icon: "loader" },
  ON_HOLD: { label: "On Hold", variant: "onHold", icon: "pause-circle" },
  COMPLETED: { label: "Completed", variant: "completed", icon: "check-circle" },
  VERIFIED: { label: "Verified", variant: "verified", icon: "shield-check" },
  CLOSED: { label: "Closed", variant: "closed", icon: "archive" },
};

export const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; variant: string; icon: string; slaHours: number }
> = {
  EMERGENCY: { label: "Emergency", variant: "emergency", icon: "siren", slaHours: 2 },
  URGENT: { label: "Urgent", variant: "urgent", icon: "alert-triangle", slaHours: 24 },
  ROUTINE: { label: "Routine", variant: "routine", icon: "clock", slaHours: 72 },
  SCHEDULED: { label: "Scheduled", variant: "scheduled", icon: "calendar", slaHours: 168 },
};

export const CATEGORY_CONFIG: Record<
  TicketCategory,
  { label: string; icon: string; emoji: string }
> = {
  PLUMBING: { label: "Plumbing", icon: "droplets", emoji: "🔧" },
  ELECTRICAL: { label: "Electrical", icon: "zap", emoji: "⚡" },
  HVAC: { label: "HVAC", icon: "thermometer", emoji: "❄️" },
  APPLIANCE: { label: "Appliance", icon: "refrigerator", emoji: "🏠" },
  STRUCTURAL: { label: "Structural", icon: "building", emoji: "🏗️" },
  PEST_CONTROL: { label: "Pest Control", icon: "bug", emoji: "🐛" },
  GENERAL: { label: "General", icon: "wrench", emoji: "🔨" },
  SAFETY: { label: "Safety", icon: "shield-alert", emoji: "🚨" },
};

export function getStatusConfig(status: TicketStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
}

export function getPriorityConfig(priority: TicketPriority) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.ROUTINE;
}

export function getCategoryConfig(category: TicketCategory) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.GENERAL;
}

/**
 * Format a status enum value for display
 */
export function formatStatus(status: string): string {
  return STATUS_CONFIG[status as TicketStatus]?.label || status.replace(/_/g, " ");
}

/**
 * Get the valid next statuses for a given current status
 */
export function getNextStatuses(currentStatus: TicketStatus, role: string): TicketStatus[] {
  const transitions: Record<TicketStatus, Record<string, TicketStatus[]>> = {
    OPEN: {
      MANAGER: [TicketStatus.ASSIGNED, TicketStatus.CLOSED],
      STAFF: [],
      TENANT: [],
    },
    ASSIGNED: {
      MANAGER: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN, TicketStatus.CLOSED],
      STAFF: [TicketStatus.IN_PROGRESS],
      TENANT: [],
    },
    IN_PROGRESS: {
      MANAGER: [TicketStatus.ON_HOLD, TicketStatus.COMPLETED, TicketStatus.CLOSED],
      STAFF: [TicketStatus.ON_HOLD, TicketStatus.COMPLETED],
      TENANT: [],
    },
    ON_HOLD: {
      MANAGER: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
      STAFF: [TicketStatus.IN_PROGRESS],
      TENANT: [],
    },
    COMPLETED: {
      MANAGER: [TicketStatus.VERIFIED, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
      STAFF: [],
      TENANT: [TicketStatus.VERIFIED],
    },
    VERIFIED: {
      MANAGER: [TicketStatus.CLOSED],
      STAFF: [],
      TENANT: [],
    },
    CLOSED: {
      MANAGER: [TicketStatus.OPEN],
      STAFF: [],
      TENANT: [],
    },
  };

  return transitions[currentStatus]?.[role] || [];
}
