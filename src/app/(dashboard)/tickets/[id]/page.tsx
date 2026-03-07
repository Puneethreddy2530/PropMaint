import { getTicketById, getStaffMembers } from "@/actions/tickets";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/form-elements";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, getNextStatuses } from "@/lib/permissions";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { CommentSection } from "@/components/tickets/comment-section";
import { FileUpload } from "@/components/tickets/file-upload";
import {
    MapPin, Clock, User, Wrench, CalendarDays, DollarSign,
    Shield, AlertTriangle, Phone, Mail,
} from "lucide-react";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    const ticket = await getTicketById(id);
    if (!ticket || !session) return notFound();

    const statusCfg = STATUS_CONFIG[ticket.status];
    const priorityCfg = PRIORITY_CONFIG[ticket.priority];
    const catCfg = CATEGORY_CONFIG[ticket.category];
    const nextStatuses = getNextStatuses(ticket.status, session.user.role);
    const staffMembers = session.user.role === "MANAGER" ? await getStaffMembers() : [];
    const canComment = true;
    const canInternalNote = session.user.role === "MANAGER" || session.user.role === "STAFF";

    // SLA calculation
    const slaInfo = ticket.slaDeadline ? (() => {
        const now = new Date();
        const deadline = new Date(ticket.slaDeadline!);
        const remaining = deadline.getTime() - now.getTime();
        const hours = Math.floor(remaining / 3600000);
        const isBreached = remaining < 0;
        const isWarning = !isBreached && hours < (PRIORITY_CONFIG[ticket.priority].slaHours * 0.25);
        return { isBreached, isWarning, hours, deadline };
    })() : null;

    return (
        <div className="space-y-4 max-w-4xl">
            {/* Back + title */}
            <div>
                <a href="/tickets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to tickets</a>
                <div className="flex items-start gap-3 mt-2">
                    <span className="text-2xl">{catCfg.emoji}</span>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold tracking-tight">{ticket.title}</h1>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant={statusCfg.variant as any}>{statusCfg.label}</Badge>
                            <Badge variant={priorityCfg.variant as any}>{priorityCfg.label}</Badge>
                            <span className="text-xs text-muted-foreground">#{ticket.id.slice(-6)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SLA Warning Banner */}
            {slaInfo && (slaInfo.isBreached || slaInfo.isWarning) && !["COMPLETED", "VERIFIED", "CLOSED"].includes(ticket.status) && (
                <Card className={slaInfo.isBreached ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}>
                    <CardContent className="p-3 flex items-center gap-3">
                        <AlertTriangle className={`w-5 h-5 ${slaInfo.isBreached ? "text-red-600" : "text-amber-600"}`} />
                        <div>
                            <p className={`text-sm font-semibold ${slaInfo.isBreached ? "text-red-900" : "text-amber-900"}`}>
                                {slaInfo.isBreached ? "SLA Breached" : "SLA Warning"}
                            </p>
                            <p className={`text-xs ${slaInfo.isBreached ? "text-red-700" : "text-amber-700"}`}>
                                {slaInfo.isBreached
                                    ? `Deadline was ${formatRelativeTime(slaInfo.deadline)}`
                                    : `${slaInfo.hours}h remaining — deadline ${formatDate(slaInfo.deadline)}`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Description */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                            {ticket.resolution && (
                                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                    <p className="text-xs font-semibold text-emerald-800 mb-1">Resolution</p>
                                    <p className="text-sm text-emerald-900">{ticket.resolution}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Attachments / File Upload */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Attachments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FileUpload
                                ticketId={ticket.id}
                                existingAttachments={ticket.attachments}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <TicketActions
                        ticketId={ticket.id}
                        currentStatus={ticket.status}
                        nextStatuses={nextStatuses}
                        staffMembers={staffMembers}
                        currentAssigneeId={ticket.assignedToId}
                        userRole={session.user.role}
                    />

                    {/* Comments */}
                    <CommentSection
                        ticketId={ticket.id}
                        comments={ticket.comments}
                        canComment={canComment}
                        canInternalNote={canInternalNote}
                        currentUserId={session.user.id}
                    />

                    {/* Activity Timeline */}
                    <ActivityTimeline activities={ticket.activities} />
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Details card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location"
                                value={`${ticket.property.name} · ${ticket.unit.building.name} · Unit ${ticket.unit.number}`} />
                            <DetailRow icon={<CalendarDays className="w-4 h-4" />} label="Created" value={formatDate(ticket.createdAt)} />
                            {ticket.slaDeadline && (
                                <DetailRow icon={<Clock className="w-4 h-4" />} label="SLA Deadline" value={formatDate(ticket.slaDeadline)} />
                            )}
                            <DetailRow icon={<Shield className="w-4 h-4" />} label="Entry Permission"
                                value={ticket.permissionToEnter ? "Granted" : "Not granted"} />
                            {ticket.preferredTimes && (
                                <DetailRow icon={<Clock className="w-4 h-4" />} label="Preferred Times" value={ticket.preferredTimes} />
                            )}
                            {(ticket.estimatedCost || ticket.actualCost) && (
                                <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Cost"
                                    value={ticket.actualCost ? `$${ticket.actualCost} (actual)` : `$${ticket.estimatedCost} (est.)`} />
                            )}
                        </CardContent>
                    </Card>

                    {/* People */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">People</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <PersonRow label="Submitted by" name={ticket.createdBy.name} role={ticket.createdBy.role}
                                email={ticket.createdBy.email} phone={ticket.createdBy.phone} />
                            {ticket.assignedTo ? (
                                <PersonRow label="Assigned to" name={ticket.assignedTo.name} role={ticket.assignedTo.role}
                                    email={ticket.assignedTo.email} phone={ticket.assignedTo.phone} />
                            ) : (
                                <div>
                                    <p className="text-xs text-muted-foreground">Assigned to</p>
                                    <p className="text-sm italic text-muted-foreground">Unassigned</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm">{value}</p>
            </div>
        </div>
    );
}

function PersonRow({ label, name, role, email, phone }: { label: string; name: string; role: string; email?: string | null; phone?: string | null }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground capitalize">{role.toLowerCase()}</p>
            {email && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{email}</p>}
            {phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{phone}</p>}
        </div>
    );
}
