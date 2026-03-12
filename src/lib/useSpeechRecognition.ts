"use client";

import { useState, useEffect, useCallback } from "react";

interface SpeechRecognitionResultLike {
    isFinal: boolean;
    0: { transcript: string };
}

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
    error: string;
}

interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            const SpeechRecognitionCtor = (window as Window & {
                SpeechRecognition?: new () => SpeechRecognitionLike;
                webkitSpeechRecognition?: new () => SpeechRecognitionLike;
            }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike; }).webkitSpeechRecognition;

            if (!SpeechRecognitionCtor) return;

            const rec = new SpeechRecognitionCtor();
            rec.continuous = true;
            rec.interimResults = true;

            rec.onresult = (event: SpeechRecognitionEventLike) => {
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

            rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
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
