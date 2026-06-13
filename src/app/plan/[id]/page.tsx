"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  PartyPopper,
  RefreshCw,
  Loader2,
  MessageCircle,
  X,
  MessageCirclePlus,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { InviteCard } from "@/components/InviteCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanView } from "@/lib/types";
import { summarize } from "@/lib/plan";

export default function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";

  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/plans/${id}`);
        if (!res.ok) throw new Error("Plan not found");
        const { plan } = await res.json();
        if (!active) return;
        setPlan(plan);
        setInviteUrl(`${window.location.origin}/i/${plan.inviteToken}`);
        setError(null);
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
  }, [id, refreshKey]);

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            {error ?? "Plan not found"}
          </p>
          <Link href="/">
            <Button className="mt-4">Start a new plan</Button>
          </Link>
        </main>
      </>
    );
  }

  const summary = summarize(plan);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join my plan: ${plan.activity.title}! ${inviteUrl}`
  )}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-20">
        {justCreated && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-primary-soft p-4 text-primary">
            <PartyPopper className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold">
              Plan created! Share the link to get everyone on board.
            </p>
          </div>
        )}

        <div className="mt-6">
          <InviteCard activity={plan.activity} />
        </div>

        <Card className="mt-5">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-semibold text-foreground">
              Share your invite link
            </p>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
              <span className="flex-1 truncate text-sm text-muted">
                {inviteUrl || "…"}
              </span>
              <Button onClick={copy} variant="soft" size="sm">
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" className="w-full">
                <MessageCircle className="h-5 w-5" />
                Share on WhatsApp
              </Button>
            </a>
          </CardContent>
        </Card>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Responses</h2>
            <button
              onClick={reload}
              className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="success">{summary.accepted} accepted</Badge>
            {summary.declined > 0 && (
              <Badge variant="danger">{summary.declined} declined</Badge>
            )}
            {summary.suggested > 0 && (
              <Badge variant="accent">{summary.suggested} suggested</Badge>
            )}
            <span className="text-sm font-medium text-muted">
              {summary.headline}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {summary.latest.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
                No responses yet. Share the link above to get started.
              </p>
            )}
            {summary.latest.map((r) => (
              <ResponseRow key={r.id} record={r} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function ResponseRow({
  record,
}: {
  record: { name: string; response: string; suggestion: string | null };
}) {
  const map = {
    accepted: {
      icon: <Check className="h-4 w-4" />,
      cls: "bg-primary-soft text-primary",
      label: "is in",
    },
    declined: {
      icon: <X className="h-4 w-4" />,
      cls: "bg-red-50 text-danger",
      label: "can't make it",
    },
    suggested: {
      icon: <MessageCirclePlus className="h-4 w-4" />,
      cls: "bg-accent-soft text-accent-foreground",
      label: "suggested a change",
    },
  } as const;
  const style = map[record.response as keyof typeof map] ?? map.accepted;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${style.cls}`}
        >
          {style.icon}
        </span>
        <p className="text-sm">
          <span className="font-semibold text-foreground">{record.name}</span>{" "}
          <span className="text-muted">{style.label}</span>
        </p>
      </div>
      {record.suggestion && (
        <p className="mt-2 rounded-xl bg-background p-3 text-sm text-foreground">
          “{record.suggestion}”
        </p>
      )}
    </div>
  );
}
