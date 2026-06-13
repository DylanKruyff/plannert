"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users, Share2, ThumbsUp } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { PromptInput } from "@/components/PromptInput";

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
            Tell us what you want to do. We&apos;ll find the options and help
            everyone agree on a plan and a time.
          </p>
        </section>

        <section className="mt-10">
          <PromptInput onSubmit={handleSubmit} loading={loading} />
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<Users className="h-6 w-6" />}
            title="Find options"
            text="Get real activity ideas based on your vibe and location."
          />
          <Feature
            icon={<Share2 className="h-6 w-6" />}
            title="Share a link"
            text="Send one link on WhatsApp. No app or account needed."
          />
          <Feature
            icon={<ThumbsUp className="h-6 w-6" />}
            title="Reach agreement"
            text="Friends accept, decline, or suggest a change in a tap."
          />
        </section>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-sm text-muted">
        Plannert — the product that creates agreement.
      </footer>
    </>
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
