import { describe, it, expect } from "vitest";
import { PERMISSIONS, hasPermission, getNextStatuses } from "@/lib/permissions";
import { UserRole, TicketStatus } from "@prisma/client";

const roles: UserRole[] = [UserRole.TENANT, UserRole.MANAGER, UserRole.STAFF];

describe("RBAC permissions", () => {
  it("grants only the roles listed per permission", () => {
    for (const permission of Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>) {
      for (const role of roles) {
        const expected = PERMISSIONS[permission].includes(role);
        expect(hasPermission(role, permission)).toBe(expected);
      }
    }
  });

  it("enforces role-based status transitions", () => {
    expect(getNextStatuses(TicketStatus.OPEN, UserRole.TENANT)).toEqual([]);
    expect(getNextStatuses(TicketStatus.OPEN, UserRole.MANAGER)).toContain(TicketStatus.ASSIGNED);
    expect(getNextStatuses(TicketStatus.IN_PROGRESS, UserRole.STAFF)).toEqual(
      expect.arrayContaining([TicketStatus.ON_HOLD, TicketStatus.COMPLETED])
    );
  });
});
