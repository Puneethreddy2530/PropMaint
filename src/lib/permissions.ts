import { UserRole, TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

export const PERMISSIONS = {
  "ticket:create": [UserRole.TENANT, UserRole.MANAGER],
  "ticket:read:own": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "ticket:read:all": [UserRole.MANAGER],
  "ticket:read:assigned": [UserRole.STAFF],
  "ticket:assign": [UserRole.MANAGER],
  "ticket:update:status": [UserRole.MANAGER, UserRole.STAFF],
  "ticket:update:priority": [UserRole.MANAGER],
  "ticket:delete": [UserRole.MANAGER],
  "ticket:close": [UserRole.MANAGER],
  "ticket:verify": [UserRole.MANAGER, UserRole.TENANT],
  "comment:create": [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF],
  "comment:internal": [UserRole.MANAGER, UserRole.STAFF],
  "team:view": [UserRole.MANAGER],
  "analytics:view": [UserRole.MANAGER],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[])?.includes(role) ?? false;
}

export const SLA_HOURS: Record<string, number> = {
  EMERGENCY: 2, URGENT: 24, ROUTINE: 72, SCHEDULED: 168,
};

export function calculateSLADeadline(createdAt: Date, priority: string): Date {
  const hours = SLA_HOURS[priority] ?? 72;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: string; color: string }> = {
  OPEN: { label: "Open", variant: "open", color: "#f59e0b" },
  ASSIGNED: { label: "Assigned", variant: "assigned", color: "#3b82f6" },
  IN_PROGRESS: { label: "In Progress", variant: "inProgress", color: "#6366f1" },
  ON_HOLD: { label: "On Hold", variant: "onHold", color: "#a855f7" },
  COMPLETED: { label: "Completed", variant: "completed", color: "#10b981" },
  VERIFIED: { label: "Verified", variant: "verified", color: "#14b8a6" },
  CLOSED: { label: "Closed", variant: "closed", color: "#94a3b8" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; variant: string; color: string; slaHours: number }> = {
  EMERGENCY: { label: "Emergency", variant: "emergency", color: "#dc2626", slaHours: 2 },
  URGENT: { label: "Urgent", variant: "urgent", color: "#f59e0b", slaHours: 24 },
  ROUTINE: { label: "Routine", variant: "routine", color: "#3b82f6", slaHours: 72 },
  SCHEDULED: { label: "Scheduled", variant: "scheduled", color: "#8b5cf6", slaHours: 168 },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; emoji: string }> = {
  PLUMBING: { label: "Plumbing", emoji: "🔧" },
  ELECTRICAL: { label: "Electrical", emoji: "⚡" },
  HVAC: { label: "HVAC", emoji: "❄️" },
  APPLIANCE: { label: "Appliance", emoji: "🏠" },
  STRUCTURAL: { label: "Structural", emoji: "🏗️" },
  PEST_CONTROL: { label: "Pest Control", emoji: "🐛" },
  GENERAL: { label: "General", emoji: "🔨" },
  SAFETY: { label: "Safety", emoji: "🚨" },
};

export function getNextStatuses(current: TicketStatus, role: string): TicketStatus[] {
  const t: Record<TicketStatus, Record<string, TicketStatus[]>> = {
    OPEN: { MANAGER: [TicketStatus.ASSIGNED, TicketStatus.CLOSED], STAFF: [], TENANT: [] },
    ASSIGNED: { MANAGER: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN], STAFF: [TicketStatus.IN_PROGRESS], TENANT: [] },
    IN_PROGRESS: { MANAGER: [TicketStatus.ON_HOLD, TicketStatus.COMPLETED], STAFF: [TicketStatus.ON_HOLD, TicketStatus.COMPLETED], TENANT: [] },
    ON_HOLD: { MANAGER: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED], STAFF: [TicketStatus.IN_PROGRESS], TENANT: [] },
    COMPLETED: { MANAGER: [TicketStatus.VERIFIED, TicketStatus.IN_PROGRESS], STAFF: [], TENANT: [TicketStatus.VERIFIED] },
    VERIFIED: { MANAGER: [TicketStatus.CLOSED], STAFF: [], TENANT: [] },
    CLOSED: { MANAGER: [TicketStatus.OPEN], STAFF: [], TENANT: [] },
  };
  return t[current]?.[role] || [];
}
