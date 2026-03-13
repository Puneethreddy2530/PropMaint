"use client";

import { useState, useEffect, useRef } from "react";

interface TriageResult {
    labels?: string[];
    scores?: number[];
}

type WorkerMessage =
    | { status: "init" | "progress"; progress?: number }
    | { status: "complete"; output?: TriageResult };

export function useAITriage() {
    const [result, setResult] = useState<TriageResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const worker = useRef<Worker | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const lastTextRef = useRef<string>("");

    const buildFallbackResult = (text: string): TriageResult => {
        const input = text.toLowerCase();
        const rules = [
            { label: "fire", regex: /\b(fire|smoke|burn|flames|sparks)\b/ },
            { label: "emergency leak", regex: /\b(gas leak|gas smell|flood|burst|sewage|water main)\b/ },
            { label: "plumbing", regex: /\b(pipe|faucet|toilet|sink|drain|leak|clog)\b/ },
            { label: "electrical", regex: /\b(outlet|breaker|electrical|power|flicker|short)\b/ },
            { label: "appliance", regex: /\b(dishwasher|oven|fridge|refrigerator|microwave|washer|dryer|appliance)\b/ },
            { label: "structural", regex: /\b(window|door|ceiling|wall|floor|crack|roof|foundation)\b/ },
            { label: "security", regex: /\b(lock|security|camera|break[- ]?in|alarm)\b/ },
        ];

        const match = rules.find((r) => r.regex.test(input));
        return {
            labels: [match?.label ?? "general"],
            scores: [0.55],
        };
    };

    const clearTimeoutRef = () => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    useEffect(() => {
        if (!worker.current) {
            // Initialize the worker
            try {
                worker.current = new Worker(new URL("./ai-worker.ts", import.meta.url), {
                    type: "module",
                });
            } catch {
                worker.current = null;
            }
        }

        const onMessageReceived = (e: MessageEvent<WorkerMessage>) => {
            switch (e.data.status) {
                case "init":
                case "progress":
                    setProgress(e.data.progress || 0);
                    break;
                case "complete":
                    clearTimeoutRef();
                    setResult(e.data.output || null);
                    setIsProcessing(false);
                    break;
            }
        };

        const onWorkerError = () => {
            if (!lastTextRef.current) return;
            clearTimeoutRef();
            setResult(buildFallbackResult(lastTextRef.current));
            setIsProcessing(false);
            setError("AI unavailable - used quick keyword matching.");
        };

        worker.current?.addEventListener("message", onMessageReceived);
        worker.current?.addEventListener("error", onWorkerError);
        worker.current?.addEventListener("messageerror", onWorkerError);
        return () => {
            worker.current?.removeEventListener("message", onMessageReceived);
            worker.current?.removeEventListener("error", onWorkerError);
            worker.current?.removeEventListener("messageerror", onWorkerError);
        };
    }, []);

    const analyzeIssue = (text: string) => {
        const input = text.trim();
        if (!input) return;
        lastTextRef.current = input;
        setIsProcessing(true);
        setResult(null);
        setError(null);
        setProgress(0);

        if (!worker.current) {
            setResult(buildFallbackResult(input));
            setIsProcessing(false);
            setError("AI unavailable - used quick keyword matching.");
            return;
        }

        clearTimeoutRef();
        timeoutRef.current = window.setTimeout(() => {
            setResult(buildFallbackResult(input));
            setIsProcessing(false);
            setError("AI timed out - used quick keyword matching.");
        }, 15000);

        // The categories we want the AI to choose from
        const labels = ["plumbing", "electrical", "appliance", "structural", "security", "emergency leak", "fire"];

        worker.current.postMessage({ text: input, labels });
    };

    return { analyzeIssue, result, isProcessing, progress, error };
}
