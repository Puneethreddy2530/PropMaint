import { getNotifications, markAllNotificationsRead } from "@/actions/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import Link from "next/link";

export default async function NotificationsPage() {
    const notifications = await getNotifications();
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);

    return (
        <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-sm text-muted-foreground">{unread.length} unread</p>
                </div>
                {unread.length > 0 && (
                    <form action={markAllNotificationsRead}>
                        <Button variant="outline" size="sm" type="submit" className="gap-1 text-xs">
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </Button>
                    </form>
                )}
            </div>

            {notifications.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <BellOff className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground">No notifications</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {unread.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">New</p>
                            {unread.map(n => (
                                <Link key={n.id} href={n.link || `/tickets/${n.ticketId}`}>
                                    <Card className="hover:shadow-md transition-all border-primary/20 bg-primary/[0.02]">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold">{n.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </>
                    )}

                    {read.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mt-4">Earlier</p>
                            {read.map(n => (
                                <Link key={n.id} href={n.link || `/tickets/${n.ticketId}`}>
                                    <Card className="hover:shadow-sm transition-all opacity-70 hover:opacity-100">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-muted mt-2 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">{n.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
