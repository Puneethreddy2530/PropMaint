"use client";

import { useState, useEffect, useRef } from 'react';

export function useAITriage() {
    const [result, setResult] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const worker = useRef<Worker | null>(null);

    useEffect(() => {
        if (!worker.current) {
            // Initialize the worker
            worker.current = new Worker(new URL('./ai-worker.ts', import.meta.url), {
                type: 'module'
            });
        }

        const onMessageReceived = (e: MessageEvent) => {
            switch (e.data.status) {
                case 'init':
                case 'progress':
                    setProgress(e.data.progress || 0);
                    break;
                case 'complete':
                    setResult(e.data.output);
                    setIsProcessing(false);
                    break;
            }
        };

        worker.current.addEventListener('message', onMessageReceived);
        return () => worker.current?.removeEventListener('message', onMessageReceived);
    }, []);

    const analyzeIssue = (text: string) => {
        if (!worker.current || !text) return;
        setIsProcessing(true);
        setResult(null);

        // The categories we want the AI to choose from
        const labels = ["plumbing", "electrical", "appliance", "structural", "security", "emergency leak", "fire"];

        worker.current.postMessage({ text, labels });
    };

    return { analyzeIssue, result, isProcessing, progress };
}
