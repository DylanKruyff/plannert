import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { Activity, SearchPreferences, Suggestion } from "./types";
import {
  buildActivities,
  fallbackPreferences,
  generateActivities,
  type ActivityIdea,
} from "./activities";

export const hasAi = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
);

const MODEL = "gemini-flash-lite-latest";

/**
 * Gemini 2.5 models run an internal "thinking" pass by default, which adds
 * several seconds of latency. This task is structured extraction/generation,
 * not deep reasoning, so we disable thinking for a much faster response.
 */
const FAST_OPTIONS = {
  google: { thinkingConfig: { thinkingBudget: 0 } },
};

const preferenceSchema = z.object({
  activityType: z.string().nullable(),
  location: z.string().nullable(),
  dateTimePreference: z.string().nullable(),
  budget: z.string().nullable(),
  groupSize: z.string().nullable(),
  preferences: z.array(z.string()),
});

const activityItemSchema = z.object({
  title: z
    .string()
    .describe(
      "Name of a real, well-known venue or a concrete activity in the city"
    ),
  emoji: z.string().describe("A single emoji that represents the activity"),
  description: z
    .string()
    .describe("One short sentence on why this fits the request"),
  locationName: z
    .string()
    .describe("Neighbourhood, area, or venue name within the city"),
  latitude: z.number().describe("Approximate latitude of the venue/area"),
  longitude: z.number().describe("Approximate longitude of the venue/area"),
  startHour: z
    .number()
    .min(0)
    .max(23)
    .describe("Realistic start hour (24h) for this kind of activity"),
  durationHrs: z.number().min(1).max(8),
  priceRange: z.string().describe('e.g. "Free", "€10/person", "€20-30/person"'),
  sourceUrl: z
    .string()
    .describe("A Google Maps search URL for the venue/activity in the city"),
  confidenceScore: z.number().min(0).max(1),
  tags: z.array(z.string()),
});

const planSchema = z.object({
  preferences: preferenceSchema,
  activities: z.array(activityItemSchema),
});

export type DiscoveredPlan = {
  preferences: SearchPreferences;
  resolvedLocation: string;
  activities: Activity[];
};

function fallbackPlan(
  prompt: string,
  locationHint: string | null
): DiscoveredPlan {
  const preferences = fallbackPreferences(prompt);
  const resolvedLocation = preferences.location ?? locationHint ?? "your area";
  return {
    preferences,
    resolvedLocation,
    activities: generateActivities(preferences, resolvedLocation),
  };
}

/**
 * Single-call planner: extracts structured preferences AND discovers real,
 * location-specific activities in one model request. Doing both together (with
 * thinking disabled) replaces the previous two sequential Gemini calls, roughly
 * halving end-to-end latency.
 *
 * The model proposes genuine, well-known venues/activities for the resolved
 * city; timestamps are still computed deterministically (see buildActivities)
 * so the model never reasons about dates/timezones. Falls back to the
 * deterministic engine when no AI key is configured or the call fails.
 */
export async function discoverPlan(
  prompt: string,
  locationHint: string | null
): Promise<DiscoveredPlan> {
  if (!hasAi) return fallbackPlan(prompt, locationHint);

  try {
    const { object } = await generateObject({
      model: google(MODEL),
      providerOptions: FAST_OPTIONS,
      schema: planSchema,
      prompt: `You help a user find things to do. Return preferences AND activities together.

User request: "${prompt}".
${
  locationHint
    ? `If the request does not name a location, assume the user is in or near "${locationHint}".`
    : ""
}

1) preferences: extract structured preferences. Only use what is stated or clearly implied; use null for anything unknown. "location" is the city/area to plan in (named in the request, otherwise the assumed location above, otherwise null).

2) activities: suggest 8 real, currently-plausible activities or genuine, well-known venues in or very near the chosen location that fit the request. Prefer concrete, real places (a known museum, park, bowling alley, climbing gym, neighbourhood for dinner) over generic placeholders.

Rules for activities:
- Only suggest things that realistically exist there. If unsure of an exact venue, suggest a real activity type tied to a real neighbourhood/area instead of inventing a fake business name.
- Do NOT invent specific opening hours, dates, ticket availability, or phone numbers.
- Provide approximate coordinates near the real place.
- sourceUrl must be a Google Maps search link, e.g. https://www.google.com/maps/search/?api=1&query=<url-encoded venue and city>.
- Give realistic price ranges and a sensible start hour (24h) for each.
- Rank from best to worst fit and set confidenceScore accordingly (best ~0.9).`,
    });

    const preferences = object.preferences;
    const resolvedLocation =
      preferences.location?.trim() || locationHint || "your area";

    const ideas: ActivityIdea[] = object.activities.map((a) => ({
      title: a.title,
      emoji: a.emoji,
      description: a.description,
      locationName: a.locationName,
      latitude: a.latitude,
      longitude: a.longitude,
      startHour: a.startHour,
      durationHrs: a.durationHrs,
      priceRange: a.priceRange,
      sourceUrl: a.sourceUrl,
      confidenceScore: a.confidenceScore,
      tags: a.tags,
    }));

    const built = buildActivities(ideas, preferences, resolvedLocation);
    if (built.length === 0) {
      return {
        preferences,
        resolvedLocation,
        activities: generateActivities(preferences, resolvedLocation),
      };
    }

    return {
      preferences,
      resolvedLocation,
      activities: built.sort((a, b) => b.confidenceScore - a.confidenceScore),
    };
  } catch {
    return fallbackPlan(prompt, locationHint);
  }
}

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(["time", "date", "activity", "location"]),
      title: z.string(),
      detail: z.string(),
    })
  ),
});

/**
 * Generate alternative suggestions when a friend can't make the current plan.
 */
export async function generateSuggestions(input: {
  activityTitle: string;
  reason: string;
  locationName: string;
}): Promise<Suggestion[]> {
  const fallback: Suggestion[] = [
    {
      type: "date",
      title: "Try Sunday instead",
      detail: "Move the plan one day later in the weekend.",
    },
    {
      type: "time",
      title: "Earlier in the evening",
      detail: "Shift to 18:00 so it works for more people.",
    },
    {
      type: "activity",
      title: "A more relaxed option",
      detail: `Swap ${input.activityTitle} for a casual dinner nearby.`,
    },
    {
      type: "location",
      title: "Somewhere more central",
      detail: `Pick a spot closer to the middle of ${input.locationName}.`,
    },
  ];

  if (!hasAi) return fallback;

  try {
    const { object } = await generateObject({
      model: google(MODEL),
      providerOptions: FAST_OPTIONS,
      schema: suggestionSchema,
      prompt: `A friend can't make this plan: "${input.activityTitle}" in ${input.locationName}.
Their reason: "${input.reason}".
Suggest 3-4 realistic alternatives (different time, date, activity, or location). Keep them generic and do not invent specific venues, events, opening hours, or availability.`,
    });
    return object.suggestions.length ? object.suggestions : fallback;
  } catch {
    return fallback;
  }
}
