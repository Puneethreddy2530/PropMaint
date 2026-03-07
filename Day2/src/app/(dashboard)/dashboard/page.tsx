import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/actions/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from "@/lib/permissions";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, Ticket, Flame, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();
  if (!stats || !session) return null;

  const role = session.user.role;
  const greeting = `Welcome back, ${session.user.name.split(" ")[0]}`;
  const subtitle = role === "TENANT" ? "Track your maintenance requests"
    : role === "MANAGER" ? "Manage properties & maintenance operations"
    : "View your assigned tasks";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={<Ticket className="w-4 h-4" />} label="Total" value={stats.total} color="text-foreground" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Open" value={stats.open} color="text-amber-600" />
        <StatCard icon={<Flame className="w-4 h-4" />} label="In Progress" value={stats.inProgress} color="text-indigo-600" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={stats.completed} color="text-emerald-600" />
      </div>

      {/* Alerts row (manager & staff only) */}
      {(role === "MANAGER" || role === "STAFF") && (stats.urgent > 0 || stats.slaBroken > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.urgent > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">{stats.urgent} Urgent/Emergency</p>
                  <p className="text-xs text-amber-700">Tickets requiring immediate attention</p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.slaBroken > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900">{stats.slaBroken} SLA Breached</p>
                  <p className="text-xs text-red-700">Past deadline — escalation needed</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent tickets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Tickets</CardTitle>
            <Link href="/tickets" className="text-sm text-primary font-medium hover:underline">
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No tickets yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentTickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status];
                const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                const catCfg = CATEGORY_CONFIG[ticket.category];
                return (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors -mx-2">
                    <div className="text-lg mt-0.5">{catCfg.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ticket.property.name} · Unit {ticket.unit.number}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant={statusCfg.variant as any} className="text-[10px]">{statusCfg.label}</Badge>
                        <Badge variant={priorityCfg.variant as any} className="text-[10px]">{priorityCfg.label}</Badge>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatRelativeTime(ticket.createdAt)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
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
