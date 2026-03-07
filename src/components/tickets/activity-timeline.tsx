import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import {
    PlusCircle, ArrowRightLeft, UserPlus, MessageSquare, Lock,
    Camera, DollarSign, AlertTriangle, TrendingUp, Clock,
} from "lucide-react";
import type { ActivityAction, UserRole } from "@prisma/client";

const ACTION_ICONS: Record<ActivityAction, React.ReactNode> = {
    TICKET_CREATED: <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />,
    STATUS_CHANGED: <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />,
    PRIORITY_CHANGED: <TrendingUp className="w-3.5 h-3.5 text-amber-600" />,
    ASSIGNED: <UserPlus className="w-3.5 h-3.5 text-indigo-600" />,
    REASSIGNED: <UserPlus className="w-3.5 h-3.5 text-purple-600" />,
    COMMENT_ADDED: <MessageSquare className="w-3.5 h-3.5 text-sky-600" />,
    INTERNAL_NOTE_ADDED: <Lock className="w-3.5 h-3.5 text-slate-600" />,
    PHOTO_UPLOADED: <Camera className="w-3.5 h-3.5 text-pink-600" />,
    COST_UPDATED: <DollarSign className="w-3.5 h-3.5 text-green-600" />,
    SLA_BREACHED: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
    ESCALATED: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />,
};

interface Activity {
    id: string;
    action: ActivityAction;
    description: string;
    createdAt: Date | string;
    performedBy: { id: string; name: string; role: UserRole; avatarUrl: string | null };
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Activity Timeline</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                    <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                        <div className="space-y-4">
                            {activities.map((activity) => (
                                <div key={activity.id} className="relative flex gap-3">
                                    {/* Icon circle */}
                                    <div className="relative z-10 flex items-center justify-center w-[31px] h-[31px] rounded-full bg-card border-2 border-border shrink-0">
                                        {ACTION_ICONS[activity.action] || <Clock className="w-3.5 h-3.5" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pt-1 pb-1">
                                        <p className="text-sm">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatRelativeTime(activity.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
