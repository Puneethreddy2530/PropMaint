// A simplified queue using localStorage for immediate demo purposes.
// In a full production app, you'd use IndexedDB (e.g., via the 'idb' library) for more robust storage.

const QUEUE_KEY = 'prop_maint_offline_queue';

export const SyncManager = {
    queueMutation: (mutation: any) => {
        if (typeof window === 'undefined') return;
        const currentQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        currentQueue.push(mutation);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
    },

    getQueue: () => {
        if (typeof window === 'undefined') return [];
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    },

    clearQueue: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(QUEUE_KEY);
    }
};
