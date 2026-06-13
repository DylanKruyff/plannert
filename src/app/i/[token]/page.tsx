"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper, Loader2, Check, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { InviteCard } from "@/components/InviteCard";
import { ResponseButtons } from "@/components/ResponseButtons";
import { SuggestionModal } from "@/components/SuggestionModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanView, ResponseType } from "@/lib/types";
import { summarize } from "@/lib/plan";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState<ResponseType | null>(null);
  const [done, setDone] = useState<ResponseType | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (!res.ok) throw new Error("This invite link is no longer valid.");
        const { plan } = await res.json();
        if (active) setPlan(plan);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const respond = async (
    response: ResponseType,
    suggestion?: string
  ): Promise<boolean> => {
    if (!name.trim()) return false;
    setPending(response);
    try {
      const res = await fetch("/api/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          response,
          suggestion: suggestion ?? null,
        }),
      });
      if (!res.ok) throw new Error("Could not send your response");
      const { plan } = await res.json();
      setPlan(plan);
      setDone(response);
      return true;
    } catch {
      return false;
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-md flex-1 px-5 py-20 text-center">
          <p className="text-lg font-semibold text-foreground">
            {error ?? "Invite not found"}
          </p>
          <Link href="/">
            <Button className="mt-4">Plan your own</Button>
          </Link>
        </main>
      </>
    );
  }

  const summary = summarize(plan);
  const needName = !name.trim();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-20">
        <div className="pt-8 text-center">
          <h1 className="text-2xl font-extrabold text-foreground">
            {plan.creatorName} invited you{" "}
            <span className="inline-block">🎉</span>
          </h1>
          <p className="mt-1 text-muted">Are you joining?</p>
        </div>

        <div className="mt-6">
          <InviteCard activity={plan.activity}>
            {summary.total > 0 && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
                <Users className="h-4 w-4" />
                {summary.accepted} going so far · {summary.headline}
              </div>
            )}
          </InviteCard>
        </div>

        {done ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                {done === "accepted" ? (
                  <PartyPopper className="h-7 w-7" />
                ) : (
                  <Check className="h-7 w-7" />
                )}
              </span>
              <p className="text-lg font-bold text-foreground">
                {done === "accepted"
                  ? "You're in! 🎉"
                  : done === "declined"
                    ? "Thanks for letting us know."
                    : "Suggestion sent!"}
              </p>
              <p className="text-sm text-muted">
                {plan.creatorName} can see your response now.
              </p>
              <Button
                variant="outline"
                onClick={() => setDone(null)}
                className="mt-2"
              >
                Change my response
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">
                Your name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah"
              />
              {needName && (
                <p className="mt-1 text-xs text-muted">
                  Add your name so {plan.creatorName} knows who replied.
                </p>
              )}
            </div>

            <ResponseButtons
              disabled={needName || pending !== null}
              pending={pending}
              onAccept={() => respond("accepted")}
              onDecline={() => respond("declined")}
              onSuggest={() => setSuggestOpen(true)}
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          No account needed. Powered by Plannert.
        </p>
      </main>

      <SuggestionModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        activityTitle={plan.activity.title}
        locationName={plan.activity.locationName}
        submitting={pending === "suggested"}
        onSubmit={async (suggestion) => {
          if (needName) {
            setSuggestOpen(false);
            return;
          }
          const ok = await respond("suggested", suggestion);
          if (ok) setSuggestOpen(false);
        }}
      />
    </>
  );
}
