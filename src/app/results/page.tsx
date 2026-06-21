"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Loader2, Frown } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ActivityCard } from "@/components/ActivityCard";
import { RefineBar } from "@/components/RefineBar";
import { Button } from "@/components/ui/button";
import { getCreatorId } from "@/lib/creator";
import type { Activity, ActivitySearchResponse } from "@/lib/types";

const LOADING_MESSAGES = [
  "Scouting the best spots…",
  "Reading the room…",
  "Checking the vibe…",
  "Weighing budget and timing…",
  "Asking the locals…",
  "Shortlisting the good stuff…",
  "Lining up your options…",
  "Almost there…",
];

/**
 * Cycles through a list of playful status messages while `active` is true,
 * resetting back to the first message each time a new load begins.
 */
function useRotatingMessage(active: boolean, intervalMs = 2800) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return LOADING_MESSAGES[index];
}

function ResultsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPrompt = params.get("q") ?? "";
  const lat = params.get("lat");
  const lng = params.get("lng");
  // When present, picking an activity edits this existing plan (the invite
  // flow's "find a different activity") instead of creating a new one.
  const updateToken = params.get("updateToken");

  // The prompt currently being searched, and the (possibly edited) draft in the
  // refine bar. Seeding both from the URL keeps reloads and shared links working.
  const [searchPrompt, setSearchPrompt] = useState(initialPrompt);
  const [draft, setDraft] = useState(initialPrompt);

  const [data, setData] = useState<ActivitySearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const resultsRef = useRef<HTMLDivElement>(null);
  const loadingMessage = useRotatingMessage(loading);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryKey((k) => k + 1);
  };

  const refine = (next: string) => {
    if (next === searchPrompt) {
      retry();
      return;
    }
    setSearchPrompt(next);
    const sp = new URLSearchParams(params.toString());
    sp.set("q", next);
    router.replace(`/results?${sp.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!searchPrompt) {
      router.replace("/");
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/activity/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: searchPrompt,
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
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
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
  }, [searchPrompt, lat, lng, router, retryKey]);

  const choose = async (activity: Activity) => {
    setChoosingId(activity.id);
    try {
      if (updateToken) {
        const res = await fetch(`/api/invite/${updateToken}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activity }),
        });
        if (!res.ok) throw new Error("Could not update plan");
        router.push(`/i/${updateToken}?updated=1`);
        return;
      }
      const res = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity, creatorId: getCreatorId() }),
      });
      if (!res.ok) throw new Error("Could not create plan");
      const { planId } = await res.json();
      router.push(`/plan/${planId}?created=1`);
    } catch {
      setChoosingId(null);
      setError(
        updateToken
          ? "Could not update the plan. Please try again."
          : "Could not create the plan. Please try again."
      );
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

        {updateToken && (
          <div className="mt-4 rounded-2xl bg-primary-soft p-4 text-sm font-semibold text-primary">
            Pick a new activity to swap into the plan. You&apos;ll share the
            update with the group next.
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Your request
          </p>
          <div className="mt-2">
            <RefineBar
              value={draft}
              onChange={setDraft}
              onSubmit={refine}
              loading={loading}
            />
          </div>
        </div>

        <div ref={resultsRef} className="scroll-mt-6">
          {loading && !data && (
            <div className="mt-16 flex flex-col items-center text-center text-muted">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p
                key={loadingMessage}
                className="mt-4 animate-[fadeIn_0.4s_ease] text-lg font-semibold text-foreground"
              >
                {loadingMessage}
              </p>
              <p className="text-sm">Hang tight, this only takes a moment.</p>
            </div>
          )}

          {error && !loading && (
            <div className="mt-16 flex flex-col items-center text-center">
              <Frown className="h-10 w-10 text-muted" />
              <p className="mt-4 text-lg font-semibold text-foreground">
                {error}
              </p>
              <Button onClick={retry} className="mt-4">
                Try again
              </Button>
            </div>
          )}

          {data && !error && (
            <section className="relative mt-6">
              {loading && (
                <div className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-foreground shadow-card">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span key={loadingMessage} className="animate-[fadeIn_0.4s_ease]">
                    {loadingMessage}
                  </span>
                </div>
              )}
              <div
                className={`grid gap-5 transition-opacity sm:grid-cols-2 ${
                  loading ? "pointer-events-none opacity-40" : "opacity-100"
                }`}
              >
                {data.activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onChoose={choose}
                    selecting={choosingId === activity.id}
                    chooseLabel={updateToken ? "Swap in this plan" : "Choose"}
                    busyLabel={updateToken ? "Updating plan…" : "Creating plan…"}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
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
