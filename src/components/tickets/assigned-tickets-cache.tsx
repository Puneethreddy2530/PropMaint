"use client";

import { useEffect } from "react";
import type { UserRole } from "@prisma/client";

const CACHE_KEY = "prop_maint_assigned_tickets";
const META_KEY = "prop_maint_assigned_tickets_meta";

type AssignedTicket = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string | Date;
  slaBroken: boolean;
  property: { name: string };
  unit: { number: string };
  assignedTo?: { name: string } | null;
  _count?: { comments: number; attachments: number };
};

export function AssignedTicketsCache({
  role,
  tickets,
}: {
  role: UserRole | null | undefined;
  tickets: AssignedTicket[];
}) {
  useEffect(() => {
    if (role !== "STAFF") return;
    if (!tickets || tickets.length === 0) return;

    const payload = tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt:
        typeof ticket.createdAt === "string"
          ? ticket.createdAt
          : ticket.createdAt.toISOString(),
      slaBroken: ticket.slaBroken,
      property: { name: ticket.property.name },
      unit: { number: ticket.unit.number },
      assignedTo: ticket.assignedTo ? { name: ticket.assignedTo.name } : null,
      _count: ticket._count,
    }));

    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ syncedAt: new Date().toISOString() })
    );
  }, [role, tickets]);

  return null;
}
