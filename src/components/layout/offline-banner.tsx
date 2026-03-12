"use client";

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { SyncManager } from '@/lib/syncManager';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineBanner() {
    const isOnline = useNetworkStatus();
    const [isMounted, setIsMounted] = useState(false);
    const [synced, setSynced] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [queuedCount, setQueuedCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        setQueuedCount(SyncManager.getQueue().length);
        return SyncManager.onQueueUpdated((count) => setQueuedCount(count));
    }, [isMounted]);

    useEffect(() => {
        if (!isOnline || !isMounted) return;

        const queue = SyncManager.getQueue();
        if (queue.length === 0) return;

        let cancelled = false;

        (async () => {
            setSyncing(true);
            const result = await SyncManager.flushQueue();
            if (cancelled) return;

            setSyncing(false);
            if (result.ok) {
                setSynced(true);
                setTimeout(() => setSynced(false), 3000);
            } else {
                setSyncError(true);
                setTimeout(() => setSyncError(false), 3000);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOnline, isMounted]);

    if (!isMounted) return null;

    return (
        <div className="w-full shrink-0 z-[100] relative">
            {!isOnline && (
                <div className="bg-yellow-600 text-white px-2 py-1.5 text-center text-sm flex justify-center items-center gap-2 font-medium shadow-md">
                    <WifiOff size={16} /> Offline Mode: {queuedCount > 0 ? `${queuedCount} change${queuedCount > 1 ? "s" : ""} queued.` : "Changes will be synced when you reconnect."}
                </div>
            )}
            {syncing && (
                <div className="bg-blue-600 text-white px-2 py-1.5 text-center text-sm flex justify-center items-center gap-2 font-medium shadow-md">
                    <Wifi size={16} /> Syncing offline changes...
                </div>
            )}
            {synced && !syncing && (
                <div className="bg-green-600 text-white px-2 py-1.5 text-center text-sm flex justify-center items-center gap-2 font-medium shadow-md">
                    <Wifi size={16} /> Network restored. All offline changes synced successfully!
                </div>
            )}
            {syncError && !syncing && (
                <div className="bg-red-600 text-white px-2 py-1.5 text-center text-sm flex justify-center items-center gap-2 font-medium shadow-md">
                    <WifiOff size={16} /> Some offline changes could not be synced. Please review the ticket.
                </div>
            )}
        </div>
    );
}
