"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Share2, ThumbsUp, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { PromptInput } from "@/components/PromptInput";
import { getCreatorId } from "@/lib/creator";
import { formatDay, formatTime } from "@/lib/utils";
import type { PlanView } from "@/lib/types";

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 6000, maximumAge: 600000 }
    );
  });
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanView[] | null>(null);

  useEffect(() => {
    const creatorId = getCreatorId();
    if (!creatorId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/plans?creatorId=${encodeURIComponent(creatorId)}`
        );
        if (!res.ok) return;
        const { plans } = await res.json();
        if (active) setPlans(plans);
      } catch {
        // Non-critical: the landing page still works without the plan list.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (prompt: string) => {
    setLoading(true);
    const params = new URLSearchParams({ q: prompt });
    const pos = await getPosition();
    if (pos) {
      params.set("lat", pos.coords.latitude.toFixed(4));
      params.set("lng", pos.coords.longitude.toFixed(4));
    }
    router.push(`/results?${params.toString()}`);
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20">
        <section className="pt-12 text-center sm:pt-20">
          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            Plan something great
            <br />
            with your friends.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-balance text-lg text-muted">
            Tell us what you want to do. We&apos;ll find the options and give you
            one link to share — the group sorts out the rest on WhatsApp.
          </p>
        </section>

        <section className="mt-10">
          <PromptInput onSubmit={handleSubmit} loading={loading} />
        </section>

        {plans && plans.length > 0 && (
          <section className="mt-16">
            <h2 className="text-lg font-bold text-foreground">Your plans</h2>
            <div className="mt-4 space-y-3">
              {plans.map((plan) => (
                <PlanRow key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<Users className="h-6 w-6" />}
            title="Find options"
            text="Get real activity ideas based on your vibe and location."
          />
          <Feature
            icon={<ThumbsUp className="h-6 w-6" />}
            title="Thumbs up to join"
            text="Friends just react on WhatsApp if they're in. No app or account needed."
          />
          <Feature
            icon={<Share2 className="h-6 w-6" />}
            title="Anyone can tweak it"
            text="Can't make it? Tap the link, change the time or plan, and re-share."
          />
        </section>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-sm text-muted">
        Plannert — the tool that gets everyone on board.
      </footer>
    </>
  );
}

function PlanRow({ plan }: { plan: PlanView }) {
  return (
    <Link
      href={`/plan/${plan.id}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-2xl">
        {plan.activity.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-foreground">
          {plan.activity.title}
        </p>
        <p className="truncate text-sm text-muted">
          {formatDay(plan.activity.startTime)} ·{" "}
          {formatTime(plan.activity.startTime)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}
