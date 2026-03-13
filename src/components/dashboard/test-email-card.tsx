"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendTestEmail } from "@/actions/email";
import { toast } from "sonner";

export function TestEmailCard() {
  const [isPending, startTransition] = useTransition();
  const [lastId, setLastId] = useState<string | null>(null);

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendTestEmail();
      if (result && "error" in result) {
        toast.error(result.message);
        return;
      }
      setLastId(result?.id ?? null);
      toast.success("Test email sent.");
    });
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/60">
      <CardContent className="p-4 space-y-2">
        <div>
          <p className="text-sm font-semibold text-emerald-900">Resend Email Test</p>
          <p className="text-xs text-emerald-800">
            Sends a test email to your signed-in manager account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSend} disabled={isPending} size="sm">
            {isPending ? "Sending..." : "Send Test Email"}
          </Button>
          {lastId ? (
            <span className="text-[11px] text-emerald-800">
              Message ID: {lastId}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
