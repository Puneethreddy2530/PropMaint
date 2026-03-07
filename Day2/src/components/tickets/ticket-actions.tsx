"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form-elements";
import { Textarea } from "@/components/ui/form-elements";
import { updateTicketStatus, assignTicket } from "@/actions/tickets";
import { STATUS_CONFIG } from "@/lib/permissions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TicketStatus, UserRole } from "@prisma/client";

interface Props {
  ticketId: string;
  currentStatus: TicketStatus;
  nextStatuses: TicketStatus[];
  staffMembers: { id: string; name: string; specialties: string[]; _count: { assignedTickets: number } }[];
  currentAssigneeId: string | null;
  userRole: UserRole;
}

export function TicketActions({ ticketId, currentStatus, nextStatuses, staffMembers, currentAssigneeId, userRole }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");

  const showResolution = selectedStatus === "COMPLETED";

  async function handleStatusChange() {
    if (!selectedStatus) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("ticketId", ticketId);
    fd.set("status", selectedStatus);
    if (resolution) fd.set("resolution", resolution);
    const result = await updateTicketStatus(fd);
    setLoading(false);
    if (result?.error) toast.error(result.error);
    else { toast.success(`Status updated to ${STATUS_CONFIG[selectedStatus as TicketStatus]?.label}`); setSelectedStatus(""); setResolution(""); }
  }

  async function handleAssign() {
    if (!selectedStaff) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("ticketId", ticketId);
    fd.set("staffId", selectedStaff);
    const result = await assignTicket(fd);
    setLoading(false);
    if (result?.error) toast.error(result.error);
    else { toast.success("Ticket assigned"); setSelectedStaff(""); }
  }

  if (nextStatuses.length === 0 && staffMembers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status transition */}
        {nextStatuses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Update Status</p>
            <div className="flex gap-2 flex-wrap">
              {nextStatuses.map(status => {
                const cfg = STATUS_CONFIG[status];
                const isSelected = selectedStatus === status;
                return (
                  <Button key={status} variant={isSelected ? "default" : "outline"} size="sm"
                    onClick={() => setSelectedStatus(isSelected ? "" : status)}
                    className="text-xs">
                    {cfg.label}
                  </Button>
                );
              })}
            </div>
            {showResolution && (
              <Textarea placeholder="Resolution notes (what was done to fix the issue)..."
                value={resolution} onChange={e => setResolution(e.target.value)} className="mt-2" />
            )}
            {selectedStatus && (
              <Button onClick={handleStatusChange} disabled={loading} size="sm" className="mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Change to ${STATUS_CONFIG[selectedStatus as TicketStatus]?.label}`}
              </Button>
            )}
          </div>
        )}

        {/* Assignment (Manager only) */}
        {staffMembers.length > 0 && userRole === "MANAGER" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Assign Technician</p>
            <div className="flex gap-2">
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s._count.assignedTickets} active)
                      {s.id === currentAssigneeId && " ✓ current"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!selectedStaff || loading} size="sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
