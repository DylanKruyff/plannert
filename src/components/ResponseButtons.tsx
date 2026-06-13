"use client";

import { Check, X, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResponseType } from "@/lib/types";

type ResponseButtonsProps = {
  onAccept: () => void;
  onDecline: () => void;
  onSuggest: () => void;
  pending?: ResponseType | null;
  disabled?: boolean;
};

export function ResponseButtons({
  onAccept,
  onDecline,
  onSuggest,
  pending,
  disabled,
}: ResponseButtonsProps) {
  return (
    <div className="space-y-3">
      <Button
        onClick={onAccept}
        disabled={disabled}
        size="lg"
        className="w-full"
      >
        {pending === "accepted" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Check className="h-5 w-5" />
        )}
        Accept
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onDecline}
          disabled={disabled}
          variant="outline"
          size="lg"
        >
          {pending === "declined" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <X className="h-5 w-5" />
          )}
          Decline
        </Button>
        <Button
          onClick={onSuggest}
          disabled={disabled}
          variant="soft"
          size="lg"
        >
          <CalendarClock className="h-5 w-5" />
          New time
        </Button>
      </div>
    </div>
  );
}
