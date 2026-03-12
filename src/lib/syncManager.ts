// A simplified queue using localStorage for immediate demo purposes.
// In a full production app, you'd use IndexedDB (e.g., via the 'idb' library) for more robust storage.

import type { OfflineMutation, OfflineSyncResult } from "@/types/offline";

type SyncResult = {
  ok: boolean;
  processed: number;
  failed: number;
};

const QUEUE_KEY = "prop_maint_offline_queue";
const QUEUE_EVENT = "offline-queue-updated";

function safeParse(raw: string | null): OfflineMutation[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function emitQueueUpdate(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { count } }));
}

function saveQueue(queue: OfflineMutation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  emitQueueUpdate(queue.length);
}

export const SyncManager = {
  createMutationId: () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  },

  queueMutation: (mutation: OfflineMutation) => {
    if (typeof window === "undefined") return;
    const currentQueue = safeParse(localStorage.getItem(QUEUE_KEY));
    const existingIndex = currentQueue.findIndex(
      (item) =>
        item.type === mutation.type &&
        item.payload.ticketId === mutation.payload.ticketId
    );
    if (existingIndex >= 0) {
      currentQueue[existingIndex] = mutation;
    } else {
      currentQueue.push(mutation);
    }
    saveQueue(currentQueue);
  },

  getQueue: (): OfflineMutation[] => {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(QUEUE_KEY));
  },

  clearQueue: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(QUEUE_KEY);
    emitQueueUpdate(0);
  },

  replaceQueue: (queue: OfflineMutation[]) => {
    saveQueue(queue);
  },

  onQueueUpdated: (handler: (count: number) => void) => {
    if (typeof window === "undefined") return () => {};
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        handler(detail.count);
      }
    };
    window.addEventListener(QUEUE_EVENT, listener);
    return () => window.removeEventListener(QUEUE_EVENT, listener);
  },

  flushQueue: async (): Promise<SyncResult> => {
    if (typeof window === "undefined") return { ok: true, processed: 0, failed: 0 };

    const queue = safeParse(localStorage.getItem(QUEUE_KEY));
    if (queue.length === 0) return { ok: true, processed: 0, failed: 0 };

    try {
      const res = await fetch("/api/offline-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: queue }),
      });

      if (!res.ok) {
        return { ok: false, processed: 0, failed: queue.length };
      }

      const data = (await res.json()) as { results?: OfflineSyncResult[] } | null;
      const results = Array.isArray(data?.results) ? data.results : [];
      const failedIds = new Set(results.filter((r) => !r.ok).map((r) => r.id));

      if (failedIds.size === 0) {
        SyncManager.clearQueue();
        return { ok: true, processed: queue.length, failed: 0 };
      }

      const remaining = queue.filter((m) => failedIds.has(m.id));
      saveQueue(remaining);
      return {
        ok: false,
        processed: queue.length - remaining.length,
        failed: remaining.length,
      };
    } catch {
      return { ok: false, processed: 0, failed: queue.length };
    }
  },
};
