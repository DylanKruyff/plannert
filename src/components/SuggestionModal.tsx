"use client";

import * as React from "react";
import { Loader2, Sparkles, Clock, Calendar, MapPin, Shuffle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Suggestion } from "@/lib/types";

type SuggestionModalProps = {
  open: boolean;
  onClose: () => void;
  activityTitle: string;
  locationName: string;
  onSubmit: (suggestion: string) => Promise<void> | void;
  submitting?: boolean;
};

const ICONS = {
  time: Clock,
  date: Calendar,
  location: MapPin,
  activity: Shuffle,
} as const;

export function SuggestionModal(props: SuggestionModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Suggest a change"
      description="Propose a different time, date, activity, or place."
    >
      {/* Inner form unmounts on close, so its state resets automatically. */}
      <SuggestionForm {...props} />
    </Modal>
  );
}

function SuggestionForm({
  activityTitle,
  locationName,
  onSubmit,
  submitting,
}: SuggestionModalProps) {
  const [reason, setReason] = React.useState("");
  const [text, setText] = React.useState("");
  const [ideas, setIdeas] = React.useState<Suggestion[]>([]);
  const [loadingIdeas, setLoadingIdeas] = React.useState(false);

  const getIdeas = async () => {
    setLoadingIdeas(true);
    try {
      const res = await fetch("/api/suggestions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityTitle, locationName, reason }),
      });
      const data = await res.json();
      setIdeas(data.suggestions ?? []);
    } catch {
      setIdeas([]);
    } finally {
      setLoadingIdeas(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          What doesn&apos;t work? (optional)
        </label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Can't Saturday"
        />
      </div>

      <Button
        type="button"
        variant="soft"
        onClick={getIdeas}
        disabled={loadingIdeas}
        className="w-full"
      >
        {loadingIdeas ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5 text-accent" />
        )}
        Suggest another option
      </Button>

      {ideas.length > 0 && (
        <div className="space-y-2">
          {ideas.map((idea, i) => {
            const Icon = ICONS[idea.type] ?? Shuffle;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setText(`${idea.title} — ${idea.detail}`)}
                className="flex w-full items-start gap-3 rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-primary-soft"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {idea.title}
                  </span>
                  <span className="block text-sm text-muted">{idea.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Your suggestion
        </label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Could we do Sunday at 18:00 instead?"
        />
      </div>

      <Button
        onClick={() => onSubmit(text.trim())}
        disabled={!text.trim() || submitting}
        className="w-full"
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        Send suggestion
      </Button>
    </div>
  );
}
