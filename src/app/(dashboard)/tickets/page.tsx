import { getTicketsForUser } from "@/actions/tickets";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "@/lib/permissions";
import { formatRelativeTime } from "@/lib/utils";
import { Ticket, MessageSquare, Paperclip, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PageTransition } from "@/components/layout/PageTransition";

export default async function TicketsPage() {
    const session = await auth();
    const tickets = await getTicketsForUser();

    const role = session?.user?.role;
    const title = role === "TENANT" ? "My Requests" : role === "MANAGER" ? "All Tickets" : "My Assignments";

    return (
        <PageTransition>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                        <p className="text-sm text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
                    </div>
                    {(role === "TENANT" || role === "MANAGER") && (
                        <Link href="/tickets/new"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                            + New Request
                        </Link>
                    )}
                </div>

                {tickets.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <Ticket className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-muted-foreground">No tickets yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {tickets.map((ticket) => {
                            const statusCfg = STATUS_CONFIG[ticket.status];
                            const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                            const catCfg = CATEGORY_CONFIG[ticket.category];
                            const isSLABroken = ticket.slaBroken;
                            const assignedTo = "assignedTo" in ticket ? ticket.assignedTo : null;

                            return (
                                <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                                    <Card className={`hover:shadow-md transition-all hover:border-primary/20 ${isSLABroken ? "border-red-200 bg-red-50/30" : ""}`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="text-lg mt-0.5 shrink-0">{catCfg.emoji}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-semibold truncate">{ticket.title}</p>
                                                        <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeTime(ticket.createdAt)}</span>
                                                    </div>

                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.description}</p>

                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {ticket.property.name} · Unit {ticket.unit.number}
                                                    </p>

                                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                        <Badge variant={statusCfg.variant as any} className="text-[10px]">{statusCfg.label}</Badge>
                                                        <Badge variant={priorityCfg.variant as any} className="text-[10px]">{priorityCfg.label}</Badge>
                                                        {isSLABroken && (
                                                            <Badge variant="destructive" className="text-[10px] gap-1">
                                                                <AlertTriangle className="w-2.5 h-2.5" /> SLA Breach
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
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            {ticket._count.comments > 0 && (
                                                                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{ticket._count.comments}</span>
                                                            )}
                                                            {ticket._count.attachments > 0 && (
                                                                <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{ticket._count.attachments}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
