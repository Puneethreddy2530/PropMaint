"use client";

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { SyncManager } from '@/lib/syncManager';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineBanner() {
    const isOnline = useNetworkStatus();
    const [isMounted, setIsMounted] = useState(false);
    const [synced, setSynced] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isOnline && isMounted) {
            const queue = SyncManager.getQueue();
            if (queue.length > 0) {
                console.log('Syncing queued offline actions...', queue);
                SyncManager.clearQueue();
                setSynced(true);
                setTimeout(() => setSynced(false), 3000);
            }
        }
    }, [isOnline, isMounted]);

    if (!isMounted) return null;

    return (
        <div className="w-full shrink-0 z-[100] relative">
            {!isOnline && (
                <div className="bg-yellow-600 text-white px-2 py-1.5 text-center text-sm flex justify-center items-center gap-2 font-medium shadow-md">
                    <WifiOff size={16} /> Offline Mode: Changes will be synced when you reconnect.
                </div>
            )}
            {synced && (
                <div className="bg-green-600 text-white px-2 py-1.5 text-center text-sm flex justify-center items-center gap-2 font-medium shadow-md">
                    <Wifi size={16} /> Network restored. All offline changes synced successfully!
                </div>
            )}
        </div>
    );
}
