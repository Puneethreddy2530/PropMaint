"use client";

import { useTransition, useOptimistic, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form-elements";
import { Textarea } from "@/components/ui/form-elements";
import { updateTicketStatus, assignTicket } from "@/actions/tickets";
import { STATUS_CONFIG } from "@/lib/permissions";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { SyncManager } from "@/lib/syncManager";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TicketStatus, UserRole } from "@prisma/client";

interface Props {
    ticketId: string;
    ticketVersion: number;
    currentStatus: TicketStatus;
    nextStatuses: TicketStatus[];
    staffMembers: { id: string; name: string; specialties: string[]; _count: { assignedTickets: number } }[];
    currentAssigneeId: string | null;
    userRole: UserRole;
}

export function TicketActions({ ticketId, ticketVersion, currentStatus, nextStatuses, staffMembers, currentAssigneeId, userRole }: Props) {
    const [isPending, startTransition] = useTransition();
    const [optimisticStatus, addOptimisticStatus] = useOptimistic<TicketStatus, TicketStatus>(
        currentStatus,
        (state, newStatus) => newStatus
    );

    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [resolution, setResolution] = useState("");
    const [selectedStaff, setSelectedStaff] = useState<string>("");
    const isOnline = useNetworkStatus();

    const showResolution = selectedStatus === "COMPLETED";

    async function handleStatusChange() {
        if (!selectedStatus) return;

        const newTargetStatus = selectedStatus as TicketStatus;
        const currentRes = resolution;

        // Reset the form UI immediately
        setSelectedStatus("");
        setResolution("");

        if (!isOnline) {
            if (newTargetStatus !== "IN_PROGRESS") {
                toast.error("You're offline. Only 'In Progress' can be queued.");
                return;
            }

            addOptimisticStatus(newTargetStatus);

            SyncManager.queueMutation({
                id: SyncManager.createMutationId(),
                type: "ticket_status_update",
                payload: {
                    ticketId,
                    status: newTargetStatus,
                    resolution: currentRes || undefined,
                    expectedVersion: ticketVersion,
                },
                queuedAt: new Date().toISOString(),
            });

            toast.success("Offline: status change queued. Will sync when online.");
            return;
        }

        startTransition(async () => {
            // Optimistically update the UI status immediately (this affects any parent components reading from this if we lifted state, but here it just shows we sent it)
            addOptimisticStatus(newTargetStatus);

            const fd = new FormData();
            fd.set("ticketId", ticketId);
            fd.set("status", newTargetStatus);
            if (currentRes) fd.set("resolution", currentRes);

            const result = await updateTicketStatus(fd);

            if (result && "error" in result) {
                toast.error(result.message);
                // If it fails, Next.js transitions revert optimistic state automatically when the action finishes
            } else {
                toast.success(`Status updated to ${STATUS_CONFIG[newTargetStatus]?.label}`);
            }
        });
    }

    async function handleAssign() {
        if (!selectedStaff) return;
        
        const targetStaff = selectedStaff;
        setSelectedStaff("");

        startTransition(async () => {
            const fd = new FormData();
            fd.set("ticketId", ticketId);
            fd.set("staffId", targetStaff);
            
            const result = await assignTicket(fd);
            
            if (result && "error" in result) {
                toast.error(result.message);
            } else {
                toast.success("Ticket assigned");
            }
        });
    }

    if (nextStatuses.length === 0 && staffMembers.length === 0) return null;

    // We still show the actions based on the *actual* current status
    // The optimistic state is mainly to provide immediate feedback feeling
    // For a full optimistic UI on the parent page, we'd lift useOptimistic to the ticket detail page wrapper

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status transition */}
                {nextStatuses.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            Update Status <span className="text-[10px] ml-2 text-muted-foreground/60">(Currently: {STATUS_CONFIG[optimisticStatus]?.label})</span>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {nextStatuses.map(status => {
                                const cfg = STATUS_CONFIG[status];
                                const isSelected = selectedStatus === status;
                                return (
                                    <Button key={status} variant={isSelected ? "default" : "outline"} size="sm"
                                        onClick={() => setSelectedStatus(isSelected ? "" : status)}
                                        className="text-xs" disabled={isPending}>
                                        {cfg.label}
                                    </Button>
                                );
                            })}
                        </div>
                        {showResolution && (
                            <Textarea placeholder="Resolution notes (what was done to fix the issue)..."
                                value={resolution} onChange={e => setResolution(e.target.value)} className="mt-2" disabled={isPending} />
                        )}
                        {selectedStatus && (
                            <Button onClick={handleStatusChange} disabled={isPending} size="sm" className="mt-2">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Change to ${STATUS_CONFIG[selectedStatus as TicketStatus]?.label}`}
                            </Button>
                        )}
                    </div>
                )}

                {/* Assignment (Manager only) */}
                {staffMembers.length > 0 && userRole === "MANAGER" && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Assign Technician</p>
                        <div className="flex gap-2">
                            <Select value={selectedStaff} onValueChange={setSelectedStaff} disabled={isPending}>
                                <SelectTrigger className="flex-1" data-testid="assign-staff-select">
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
                            <Button onClick={handleAssign} disabled={!selectedStaff || isPending} size="sm" data-testid="assign-staff">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

