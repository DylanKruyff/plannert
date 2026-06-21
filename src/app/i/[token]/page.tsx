"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CalendarClock,
  Pencil,
  Search,
  ThumbsUp,
  Send,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { InviteCard } from "@/components/InviteCard";
import { ShareModal } from "@/components/ShareModal";
import { EditDateTimeModal } from "@/components/EditDateTimeModal";
import { EditEventModal } from "@/components/EditEventModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Activity, PlanView } from "@/lib/types";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Once the plan has been changed it MUST be re-shared, so we keep a persistent
  // reminder on the page and pop the share modal open to make that unmissable.
  const [hasUpdated, setHasUpdated] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dateTimeOpen, setDateTimeOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (!res.ok) throw new Error("This invite link is no longer valid.");
        const { plan } = await res.json();
        if (!active) return;
        setPlan(plan);
        setInviteUrl(`${window.location.origin}/i/${token}`);
        // Coming back from a "find a different activity" search.
        if (
          new URLSearchParams(window.location.search).get("updated") === "1"
        ) {
          setHasUpdated(true);
          setShareOpen(true);
        }
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

  const update = async (changes: Partial<Activity>): Promise<boolean> => {
    if (!plan) return false;
    setSaving(true);
    try {
      const activity = { ...plan.activity, ...changes };
      const res = await fetch(`/api/invite/${token}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity }),
      });
      if (!res.ok) throw new Error("Could not update the plan");
      const { plan: updated } = await res.json();
      setPlan(updated);
      setHasUpdated(true);
      setShareOpen(true);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const findDifferentActivity = () => {
    if (!plan) return;
    const { activity } = plan;
    const sp = new URLSearchParams({
      q: `${activity.title} in ${activity.locationName}`,
      updateToken: token,
    });
    if (Number.isFinite(activity.latitude)) {
      sp.set("lat", activity.latitude.toFixed(4));
      sp.set("lng", activity.longitude.toFixed(4));
    }
    router.push(`/results?${sp.toString()}`);
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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-20">
        <div className="pt-8 text-center">
          <h1 className="text-2xl font-extrabold text-foreground">
            {plan.creatorName} shared a plan
          </h1>
        </div>

        {hasUpdated && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-primary-soft p-4 text-primary sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">
              You changed the plan — share it so everyone sees the update.
            </p>
            <Button
              onClick={() => setShareOpen(true)}
              variant="primary"
              size="sm"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
              Share now
            </Button>
          </div>
        )}

        <div className="mt-6">
          <InviteCard activity={plan.activity}>
            <div className="flex items-start gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary">
              <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                If this works for you, head back to the chat and react with a
                thumbs up — no need to do anything here.
              </p>
            </div>
          </InviteCard>
        </div>

        <Card className="mt-6">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-semibold text-foreground">
              Can&apos;t make it? Suggest a change
            </p>
            <p className="text-sm text-muted">
              Pick a new time or swap the plan, then share the update with the
              group.
            </p>

            <Button
              onClick={() => setDateTimeOpen(true)}
              variant="soft"
              size="lg"
              className="w-full justify-start"
            >
              <CalendarClock className="h-5 w-5" />
              Change date &amp; time
            </Button>
            <Button
              onClick={() => setEventOpen(true)}
              variant="soft"
              size="lg"
              className="w-full justify-start"
            >
              <Pencil className="h-5 w-5" />
              Edit the event details
            </Button>
            <Button
              onClick={findDifferentActivity}
              variant="soft"
              size="lg"
              className="w-full justify-start"
            >
              <Search className="h-5 w-5" />
              Find a different activity
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          No account needed. Powered by Plannert.
        </p>
      </main>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        activity={plan.activity}
        inviteUrl={inviteUrl}
      />
      <EditDateTimeModal
        open={dateTimeOpen}
        onClose={() => setDateTimeOpen(false)}
        activity={plan.activity}
        submitting={saving}
        onSubmit={async (input) => {
          const ok = await update(input);
          if (ok) setDateTimeOpen(false);
        }}
      />
      <EditEventModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        activity={plan.activity}
        submitting={saving}
        onSubmit={async (input) => {
          const ok = await update(input);
          if (ok) setEventOpen(false);
        }}
      />
    </>
  );
}
