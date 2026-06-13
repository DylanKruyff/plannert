"use client";

import * as React from "react";
import { Sparkles, RefreshCw, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const REFINEMENTS = [
  "Make it cheaper",
  "Something more upscale",
  "Later in the day",
  "More active",
  "More relaxed",
  "Keep it indoors",
  "Good for a bigger group",
  "More unique / off the beaten path",
];

type RefineBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  loading?: boolean;
};

/**
 * Editable prompt + quick refinement chips shown above the results so users can
 * adjust their request or add extra detail and re-run the search in place,
 * instead of going back to the start and retyping.
 */
export function RefineBar({
  value,
  onChange,
  onSubmit,
  loading,
}: RefineBarProps) {
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  };

  const addDetail = (detail: string) => {
    if (loading) return;
    const base = value.trim();
    const next = base ? `${base}, ${detail.toLowerCase()}` : detail;
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-2 shadow-card">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={2}
        placeholder="Adjust your request or add more detail…"
        className="border-0 bg-transparent text-lg focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
          <Sparkles className="h-4 w-4 text-accent" />
          Tweak it and we&apos;ll find new options
        </span>
        <Button
          onClick={submit}
          disabled={loading || !value.trim()}
          size="md"
          className="ml-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Updating…
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              Update options
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 px-2 pb-1 pt-1">
        {REFINEMENTS.map((detail) => (
          <button
            key={detail}
            type="button"
            onClick={() => addDetail(detail)}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary-soft disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            {detail}
          </button>
        ))}
      </div>
    </div>
  );
}
