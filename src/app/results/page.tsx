"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Loader2, Frown } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ActivityCard } from "@/components/ActivityCard";
import { Button } from "@/components/ui/button";
import type { Activity, ActivitySearchResponse } from "@/lib/types";

function ResultsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const prompt = params.get("q") ?? "";
  const lat = params.get("lat");
  const lng = params.get("lng");

  const [data, setData] = useState<ActivitySearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    if (!prompt) {
      router.replace("/");
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/activity/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            lat: lat ? Number(lat) : undefined,
            lng: lng ? Number(lng) : undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Search failed");
        }
        const json = await res.json();
        if (active) {
          setData(json);
          setError(null);
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
  }, [prompt, lat, lng, router, retryKey]);

  const choose = async (activity: Activity) => {
    setChoosingId(activity.id);
    try {
      const res = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity }),
      });
      if (!res.ok) throw new Error("Could not create plan");
      const { planId } = await res.json();
      router.push(`/plan/${planId}?created=1`);
    } catch {
      setChoosingId(null);
      setError("Could not create the plan. Please try again.");
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20">
        <div className="flex items-center justify-between gap-4 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            New search
          </Link>
          {data && (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-4 w-4 text-primary" />
              {data.resolvedLocation}
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Your request
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground">
            “{prompt}”
          </h1>
        </div>

        {loading && (
          <div className="mt-16 flex flex-col items-center text-center text-muted">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              Finding great options…
            </p>
            <p className="text-sm">Matching your vibe, budget, and timing.</p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-16 flex flex-col items-center text-center">
            <Frown className="h-10 w-10 text-muted" />
            <p className="mt-4 text-lg font-semibold text-foreground">{error}</p>
            <Button onClick={retry} className="mt-4">
              Try again
            </Button>
          </div>
        )}

        {data && !loading && (
          <section className="mt-6 grid gap-5 sm:grid-cols-2">
            {data.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onChoose={choose}
                selecting={choosingId === activity.id}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResultsInner />
    </Suspense>
  );
}
