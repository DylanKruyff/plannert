"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PartyPopper, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { InviteCard } from "@/components/InviteCard";
import { SharePanel } from "@/components/SharePanel";
import { Button } from "@/components/ui/button";
import type { PlanView } from "@/lib/types";

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
  const [inviteUrl, setInviteUrl] = useState("");

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
  }, [id]);

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-20">
        {justCreated && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-primary-soft p-4 text-primary">
            <PartyPopper className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold">
              Plan created! Share it with the group to get everyone on board.
            </p>
          </div>
        )}

        <div className="mt-6">
          <SharePanel activity={plan.activity} inviteUrl={inviteUrl} />
        </div>

        <div className="mt-6">
          <InviteCard activity={plan.activity} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Friends reply on WhatsApp. If someone can&apos;t make it, they&apos;ll
          tweak the plan and re-share it here.
        </p>
      </main>
    </>
  );
}
