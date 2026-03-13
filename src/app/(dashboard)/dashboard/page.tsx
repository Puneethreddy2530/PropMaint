import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/actions/tickets";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentTickets } from "@/components/dashboard/recent-tickets";
import { PageTransition } from "@/components/layout/PageTransition";

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

                <DashboardStats stats={stats} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <RecentTickets tickets={stats.recentTickets} />
                </div>
            </div>
        </PageTransition>
    );
}
