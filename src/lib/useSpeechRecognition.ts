"use client";

import { useState, useEffect, useCallback } from "react";

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;

            rec.onresult = (event: any) => {
                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        currentTranscript += event.results[i][0].transcript + " ";
                    }
                }
                if (currentTranscript) {
                    setTranscript((prev) => prev + currentTranscript);
                }
            };

            rec.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            rec.onend = () => setIsListening(false);
            setRecognition(rec);
        }
    }, []);

    const toggleListening = useCallback(() => {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    }, [recognition, isListening]);

    const clearTranscript = () => setTranscript("");

    return { isListening, transcript, toggleListening, clearTranscript, hasSupport: !!recognition };
}
