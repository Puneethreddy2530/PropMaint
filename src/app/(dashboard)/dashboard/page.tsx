import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/actions/tickets";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentTickets } from "@/components/dashboard/recent-tickets";
import { PageTransition } from "@/components/layout/PageTransition";
import { AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
    const session = await auth();
    const stats = await getDashboardStats();

    if (!stats) {
        return <div>Failed to load stats</div>;
    }

    return (
        <PageTransition>
            <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back, {session?.user?.name}
                </h1>

                {session?.user?.role === "MANAGER" && stats.slaBroken > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-semibold">SLA Breach</span>
                        <span className="text-red-700">{stats.slaBroken} ticket{stats.slaBroken === 1 ? "" : "s"} past SLA</span>
                        <a href="/tickets" className="ml-auto text-red-700 underline">View tickets</a>
                    </div>
                )}

                <DashboardStats stats={stats} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <RecentTickets tickets={stats.recentTickets} />
                </div>
            </div>
        </PageTransition>
    );
}
