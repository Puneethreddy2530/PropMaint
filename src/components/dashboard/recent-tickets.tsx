import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ticket {
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
    property: {
        name: string;
    };
    unit: {
        number: string;
    };
}

interface RecentTicketsProps {
    tickets: Ticket[];
}

export function RecentTickets({ tickets }: RecentTicketsProps) {
    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Recent Tickets</CardTitle>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="/tickets">
                        View All
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {tickets.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-6">
                            No tickets found.
                        </div>
                    ) : (
                        tickets.map((ticket) => (
                            <div key={ticket.id} className="flex items-center">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                                            {ticket.title}
                                        </Link>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {ticket.property.name} • Unit {ticket.unit.number}
                                    </p>
                                </div>
                                <div className="ml-auto flex flex-col items-end gap-1">
                                    <Badge variant={ticket.status === "OPEN" ? "destructive" : "secondary"}>
                                        {ticket.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
