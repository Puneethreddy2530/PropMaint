"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 72; // px to drag before triggering refresh

export function PullToRefresh({ children, className }: PullToRefreshProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    return !el || el.scrollTop === 0;
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (!isAtTop()) return;
    startYRef.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isAtTop() || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Dampen the pull (rubber-band effect)
      setPullDistance(Math.min(delta * 0.4, THRESHOLD + 20));
    }
  }

  async function handleTouchEnd() {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Lock at threshold while refreshing
      router.refresh();
      // Give the refresh a moment to settle before resetting
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isTriggered = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn("overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : 0 }}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground transition-all",
            isTriggered && "text-primary"
          )}
        >
          <RefreshCw
            className={cn(
              "w-5 h-5 transition-transform duration-300",
              refreshing ? "animate-spin" : ""
            )}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 180}deg)` }}
          />
          <span className="font-medium text-xs">
            {refreshing ? "Refreshing…" : isTriggered ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
