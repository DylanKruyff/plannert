import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverPlan, hasAi } from "@/lib/ai";
import { reverseGeocode } from "@/lib/geocode";
import type { ActivitySearchResponse } from "@/lib/types";

const bodySchema = z.object({
  prompt: z.string().min(1).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter what you'd like to do." },
      { status: 400 }
    );
  }

  const { prompt, lat, lng } = parsed.data;

  // Resolve a location hint from coordinates so the single AI call can use it
  // when the prompt itself doesn't name a place.
  const locationHint =
    lat !== undefined && lng !== undefined
      ? await reverseGeocode(lat, lng)
      : null;

  const { preferences, resolvedLocation, activities } = await discoverPlan(
    prompt,
    locationHint
  );

  const payload: ActivitySearchResponse = {
    preferences,
    resolvedLocation,
    activities,
    usedAi: hasAi,
  };

  return NextResponse.json(payload);
}
