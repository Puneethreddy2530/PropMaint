import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/actions/tickets";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentTickets } from "@/components/dashboard/recent-tickets";

export default async function DashboardPage() {
    const session = await auth();
    const stats = await getDashboardStats();

    if (!stats) {
        return <div>Failed to load stats</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {session?.user?.name}
            </h1>

            <DashboardStats stats={stats} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RecentTickets tickets={stats.recentTickets} />
                {/* Placeholder for future widgets like Notifications or a Calendar */}
                <div className="col-span-1 lg:col-span-5 hidden">
                    {/* Extended content area */}
                </div>
            </div>
        </div>
    );
}
