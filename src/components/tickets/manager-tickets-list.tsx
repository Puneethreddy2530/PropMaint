"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkAssignTickets } from "@/actions/tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form-elements";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "@/lib/permissions";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { StaffMember, TicketListItem } from "@/services/ticketService";

type Props = {
  tickets: TicketListItem[];
  staffMembers: StaffMember[];
};

export function ManagerTicketsList({ tickets, staffMembers }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const allSelected = selectedIds.length > 0 && selectedIds.length === tickets.length;

  const { breached, dueSoon } = useMemo(() => {
    const now = Date.now();
    const breachedTickets = tickets.filter((t) => t.slaBroken);
    const dueSoonTickets = tickets.filter((t) => {
      if (!t.slaDeadline || t.slaBroken) return false;
      const deadline = new Date(t.slaDeadline).getTime();
      const hoursLeft = (deadline - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 6;
    });
    return { breached: breachedTickets, dueSoon: dueSoonTickets };
  }, [tickets]);

  function toggleAll() {
    setSelectedIds(allSelected ? [] : tickets.map((t) => t.id));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleBulkAssign() {
    if (!selectedStaff || selectedIds.length === 0) return;
    const staff = staffMembers.find((s) => s.id === selectedStaff);
    startTransition(async () => {
      const result = await bulkAssignTickets({
        staffId: selectedStaff,
        ticketIds: selectedIds,
      });

      if (result && "error" in result) {
        toast.error(result.message);
        return;
      }

      toast.success(
        `Assigned ${selectedIds.length} ticket${selectedIds.length === 1 ? "" : "s"} to ${staff?.name ?? "technician"}`
      );
      setSelectedIds([]);
      setSelectedStaff("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {(breached.length > 0 || dueSoon.length > 0) && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 space-y-2">
            {breached.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-900">
                <Flame className="h-4 w-4 animate-pulse text-red-600" />
                <span className="font-semibold">SLA Breach</span>
                <span className="text-red-700">{breached.length} ticket{breached.length === 1 ? "" : "s"} need immediate attention</span>
              </div>
            )}
            {dueSoon.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-semibold">Due Soon</span>
                <span className="text-amber-700">{dueSoon.length} ticket{dueSoon.length === 1 ? "" : "s"} within 6 hours of SLA</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allSelected}
              onChange={toggleAll}
            />
            <div>
              <p className="text-sm font-semibold">Bulk Assign</p>
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} selected
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Assign to technician..." />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s._count.assignedTickets} active)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleBulkAssign} disabled={!selectedStaff || selectedIds.length === 0 || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Selected"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {tickets.map((ticket) => {
          const statusCfg = STATUS_CONFIG[ticket.status];
          const priorityCfg = PRIORITY_CONFIG[ticket.priority];
          const catCfg = CATEGORY_CONFIG[ticket.category];
          const isSLABroken = ticket.slaBroken;
          const assignedTo = ticket.assignedTo;
          const slaDeadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : null;
          const hoursLeft =
            slaDeadline && !isSLABroken
              ? Math.round((slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60))
              : null;
          const dueSoonFlag = hoursLeft !== null && hoursLeft <= 6 && hoursLeft >= 0;

          return (
            <Card
              key={ticket.id}
              className={`transition-all hover:shadow-md ${isSLABroken ? "border-red-200 bg-red-50/40 border-l-4 border-l-red-500" : dueSoonFlag ? "border-amber-200 bg-amber-50/30 border-l-4 border-l-amber-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input"
                    checked={selectedIds.includes(ticket.id)}
                    onChange={() => toggleOne(ticket.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/tickets/${ticket.id}`} className="text-sm font-semibold truncate hover:underline block">
                          {ticket.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeTime(ticket.createdAt)}</span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {ticket.property.name} · Unit {ticket.unit.number}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
                      <Badge variant={priorityCfg.variant} className="text-[10px]">{priorityCfg.label}</Badge>
                      {isSLABroken && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> SLA Breach
                        </Badge>
                      )}
                      {!isSLABroken && dueSoonFlag && hoursLeft !== null && (
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                          SLA due in {hoursLeft}h
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {assignedTo ? (
                          <span>→ {assignedTo.name}</span>
                        ) : (
                          <span className="italic">Unassigned</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-lg mt-0.5">{catCfg.emoji}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
