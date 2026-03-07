import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function AnalyticsPage() {
    const session = await auth();
    if (session?.user?.role !== "MANAGER") redirect("/dashboard");

    const managerId = session.user.id;
    const where = { property: { managerId } };

    const [total, byStatus, byPriority, byCategory, avgResolution] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.groupBy({ by: ["status"], where, _count: true }),
        prisma.ticket.groupBy({ by: ["priority"], where, _count: true }),
        prisma.ticket.groupBy({ by: ["category"], where, _count: true }),
        prisma.ticket.aggregate({ where: { ...where, completedAt: { not: null } }, _avg: { actualCost: true } }),
    ]);

    const completedTickets = await prisma.ticket.findMany({
        where: { ...where, completedAt: { not: null }, startedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
    });

    const avgResolutionHours = completedTickets.length > 0
        ? Math.round(completedTickets.reduce((sum, t) => {
            return sum + (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()) / 3600000;
        }, 0) / completedTickets.length)
        : 0;

    const slaBroken = await prisma.ticket.count({ where: { ...where, slaBroken: true } });
    const slaCompliance = total > 0 ? Math.round(((total - slaBroken) / total) * 100) : 100;

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
                <p className="text-sm text-muted-foreground">Performance overview across all properties</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard icon={<BarChart3 className="w-4 h-4" />} label="Total Tickets" value={total.toString()} color="text-foreground" />
                <KPICard icon={<Clock className="w-4 h-4" />} label="Avg Resolution" value={`${avgResolutionHours}h`} color="text-blue-600" />
                <KPICard icon={<CheckCircle2 className="w-4 h-4" />} label="SLA Compliance" value={`${slaCompliance}%`}
                    color={slaCompliance >= 90 ? "text-emerald-600" : slaCompliance >= 70 ? "text-amber-600" : "text-red-600"} />
                <KPICard icon={<AlertTriangle className="w-4 h-4" />} label="SLA Breaches" value={slaBroken.toString()} color="text-red-600" />
            </div>

            {/* Status Breakdown */}
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tickets by Status</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {byStatus.map(s => (
                            <div key={s.status} className="flex items-center gap-3">
                                <span className="text-xs font-medium w-24">{s.status.replace("_", " ")}</span>
                                <div className="flex-1 bg-muted rounded-full h-3">
                                    <div className="h-3 rounded-full bg-primary/70 transition-all"
                                        style={{ width: `${total > 0 ? (s._count / total) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs font-semibold w-8 text-right">{s._count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Priority + Category */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {byPriority.map(p => (
                                <div key={p.priority} className="flex items-center justify-between text-sm">
                                    <span>{p.priority}</span>
                                    <span className="font-semibold">{p._count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {byCategory.map(c => (
                                <div key={c.category} className="flex items-center justify-between text-sm">
                                    <span>{c.category.replace("_", " ")}</span>
                                    <span className="font-semibold">{c._count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className={color}>{icon}</span>
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
        </Card>
    );
}
