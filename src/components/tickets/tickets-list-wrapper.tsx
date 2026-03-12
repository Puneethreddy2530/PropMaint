"use client";

import { PullToRefresh } from "@/components/layout/pull-to-refresh";

export function TicketsListWrapper({ children }: { children: React.ReactNode }) {
    return (
        <PullToRefresh className="min-h-screen -mx-4 px-4 -mt-4 pt-4 md:mx-0 md:px-0 md:mt-0 md:pt-0">
            {children}
        </PullToRefresh>
    );
}
