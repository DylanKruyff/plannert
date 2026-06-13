"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  PartyPopper,
  Loader2,
  Check,
  Users,
  Clock,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { InviteCard } from "@/components/InviteCard";
import { ResponseButtons } from "@/components/ResponseButtons";
import { DateTimeProposalModal } from "@/components/DateTimeProposalModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanView, ResponseType, TimeProposal } from "@/lib/types";
import { summarize } from "@/lib/plan";
import { formatDay, formatTime } from "@/lib/utils";

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
  const [proposing, setProposing] = useState(false);
  const [myProposal, setMyProposal] = useState<TimeProposal | null>(null);
  const [checking, setChecking] = useState(false);

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

  const respond = async (response: ResponseType): Promise<boolean> => {
    if (!name.trim()) return false;
    setPending(response);
    try {
      const res = await fetch("/api/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), response }),
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

  const propose = async (input: {
    proposedStart: string;
    proposedEnd: string;
    message: string | null;
  }): Promise<boolean> => {
    if (!name.trim()) return false;
    setProposing(true);
    try {
      const res = await fetch("/api/invite/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), ...input }),
      });
      if (!res.ok) throw new Error("Could not send your suggestion");
      const { plan } = await res.json();
      setPlan(plan);
      const mine = (plan.proposals as TimeProposal[])
        .filter((p) => p.name.toLowerCase() === name.trim().toLowerCase())
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
      setMyProposal(mine ?? null);
      return true;
    } catch {
      return false;
    } finally {
      setProposing(false);
    }
  };

  const checkStatus = async () => {
    if (!myProposal) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/invite/${token}`);
      if (!res.ok) return;
      const { plan } = await res.json();
      setPlan(plan);
      const updated = (plan.proposals as TimeProposal[]).find(
        (p) => p.id === myProposal.id
      );
      if (updated) setMyProposal(updated);
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setDone(null);
    setMyProposal(null);
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

        {myProposal ? (
          <ProposalStatusCard
            proposal={myProposal}
            creatorName={plan.creatorName}
            checking={checking}
            onCheck={checkStatus}
            onReset={reset}
          />
        ) : done ? (
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
                  : "Thanks for letting us know."}
              </p>
              <p className="text-sm text-muted">
                {plan.creatorName} can see your response now.
              </p>
              <Button variant="outline" onClick={reset} className="mt-2">
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

      <DateTimeProposalModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        activity={plan.activity}
        submitting={proposing}
        onSubmit={async (input) => {
          if (needName) {
            setSuggestOpen(false);
            return;
          }
          const ok = await propose(input);
          if (ok) setSuggestOpen(false);
        }}
      />
    </>
  );
}

function ProposalStatusCard({
  proposal,
  creatorName,
  checking,
  onCheck,
  onReset,
}: {
  proposal: TimeProposal;
  creatorName: string;
  checking: boolean;
  onCheck: () => void;
  onReset: () => void;
}) {
  const when = `${formatDay(proposal.proposedStart)} · ${formatTime(
    proposal.proposedStart
  )}`;

  if (proposal.status === "allowed") {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <PartyPopper className="h-7 w-7" />
          </span>
          <p className="text-lg font-bold text-foreground">
            You&apos;re in! 🎉
          </p>
          <p className="text-sm text-muted">
            {creatorName} approved your new time. See you {when}.
          </p>
          <Button variant="outline" onClick={onReset} className="mt-2">
            Change my response
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (proposal.status === "declined") {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-danger">
            <Check className="h-7 w-7" />
          </span>
          <p className="text-lg font-bold text-foreground">
            {creatorName} kept the original plan.
          </p>
          <p className="text-sm text-muted">
            Your suggested time wasn&apos;t a fit, so you&apos;re marked as
            can&apos;t make it.
          </p>
          <Button variant="outline" onClick={onReset} className="mt-2">
            Change my response
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
          <Clock className="h-7 w-7" />
        </span>
        <p className="text-lg font-bold text-foreground">Suggestion sent!</p>
        <div className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">
          <CalendarClock className="h-4 w-4" />
          {when}
        </div>
        <p className="text-sm text-muted">
          Waiting for {creatorName} to allow or decline. If they allow it,
          you&apos;re automatically in.
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <Button variant="soft" onClick={onCheck} disabled={checking}>
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check for a response
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Respond a different way
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
