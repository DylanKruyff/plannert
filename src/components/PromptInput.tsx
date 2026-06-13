"use client";

import * as React from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Something fun this weekend",
  "Cheap activity",
  "Date idea",
  "Rainy day activity",
];

type PromptInputProps = {
  onSubmit: (prompt: string) => void;
  loading?: boolean;
  defaultValue?: string;
  className?: string;
};

export function PromptInput({
  onSubmit,
  loading,
  defaultValue = "",
  className,
}: PromptInputProps) {
  const [value, setValue] = React.useState(defaultValue);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-2xl border border-border bg-surface p-2 shadow-card">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={2}
          placeholder="Tell us what you want to do…"
          className="border-0 bg-transparent text-lg focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1">
          <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
            <Sparkles className="h-4 w-4 text-accent" />
            We&apos;ll find the options
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
                Finding…
              </>
            ) : (
              <>
                Create plan
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setValue(ex)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-soft"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
