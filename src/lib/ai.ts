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
      "The activity/experience itself, not just a venue name. Phrase it as something to DO " +
        '(e.g. "Catch live jazz at the Bimhuis", "Browse the Saturday flea market at IJ-Hallen"). ' +
        "For events like concerts/shows/festivals, name the type of event plus the real venue/area " +
        "where they happen, NOT just the building."
    ),
  emoji: z.string().describe("A single emoji that represents the activity"),
  description: z
    .string()
    .describe(
      "One short sentence on what you'll actually do there and why it fits the request"
    ),
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
    .describe(
      "Where the user can actually find/book this. For time-bound events (concerts, shows, " +
        "festivals, sports), use an event-listings or venue 'what's on' search URL (e.g. " +
        "Songkick, Ticketmaster, Resident Advisor, or the venue's events page) so they see real " +
        "upcoming dates. Otherwise a Google Maps search link is fine: " +
        "https://www.google.com/maps/search/?api=1&query=<url-encoded venue and city>."
    ),
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

/**
 * Broad activity categories used to nudge the model toward a varied mix instead
 * of always returning the same handful of "safe" venues. We sample a rotating
 * subset per request so repeated searches surface fresh ideas.
 */
const ACTIVITY_FLAVORS = [
  "food & drink (restaurants, street food, tastings)",
  "arts & culture (museums, galleries, theatre, live music)",
  "outdoors & nature (parks, walks, water, viewpoints)",
  "active & sporty (climbing, cycling, watersports, skating)",
  "nightlife & social (bars, comedy, dancing)",
  "hands-on & workshops (cooking, pottery, crafts)",
  "games & play (arcades, bowling, mini-golf, escape rooms)",
  "wellness & relaxed (spas, baths, slow cafés)",
  "markets & shopping (flea markets, design shops, bookstores)",
  "quirky & offbeat (hidden gems, unusual tours, local secrets)",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

  // Rotate a subset of flavors per request and pass a random seed so repeated
  // searches for the same thing surface genuinely different, creative ideas
  // instead of converging on the same predictable venues.
  const flavorMix = shuffle(ACTIVITY_FLAVORS).slice(0, 6);
  const creativitySeed = Math.floor(Math.random() * 1_000_000);

  try {
    const { object } = await generateObject({
      model: google(MODEL),
      providerOptions: FAST_OPTIONS,
      schema: planSchema,
      // Higher temperature + per-request seed widen the variety of suggestions.
      temperature: 1,
      seed: creativitySeed,
      prompt: `You help a user find things to do. Return preferences AND activities together.

User request: "${prompt}".
${
  locationHint
    ? `If the request does not name a location, assume the user is in or near "${locationHint}".`
    : ""
}

1) preferences: extract structured preferences. Only use what is stated or clearly implied; use null for anything unknown. "location" is the city/area to plan in (named in the request, otherwise the assumed location above, otherwise null). For "dateTimePreference", only fill it if the request actually mentions a day or time (e.g. "tonight", "this weekend", "Sunday"); if no date/time is mentioned, leave it null so the plan defaults to today / the very near future.

2) activities: suggest 8 real, currently-plausible THINGS TO DO in or very near the chosen location that fit the request. Each item should be an activity or experience, not just the name of a venue.

If the request is about time-bound events (concerts, gigs, shows, plays, festivals, sports, exhibitions), do NOT just list the venues. Instead suggest the actual experience — e.g. "See a touring band at Paradiso", "Catch a jazz set at the Bimhuis", "Watch what's on at the Concertgebouw" — and put an event-listings or venue "what's on" URL in sourceUrl so the user can find the real upcoming dates. Since you don't have live listings, do not name specific artists, exact dates, or ticket prices you aren't sure about; describe the kind of event and point to where the real schedule lives.

Make the set DIVERSE and CREATIVE:
- Span several different vibes — aim to draw from a mix such as: ${flavorMix.join("; ")}.
- Mix obvious crowd-pleasers with a couple of lesser-known local gems or unexpected, memorable options.
- Vary the price ranges, times of day, energy levels, and indoor/outdoor settings rather than repeating one type.
- Avoid defaulting to the same handful of generic suggestions; surprise the user with at least one or two ideas they likely wouldn't have thought of.
- Use random seed ${creativitySeed} as inspiration to keep this list fresh and distinct from previous answers.

Rules for activities:
- Phrase every title as something to DO, not a bare venue name.
- Only suggest things that realistically exist there. If unsure of an exact venue, suggest a real activity type tied to a real neighbourhood/area instead of inventing a fake business name.
- Do NOT invent specific opening hours, exact dates, line-ups, ticket availability, or phone numbers; for events, point to listings instead of guessing the schedule.
- Provide approximate coordinates near the real place.
- sourceUrl: for time-bound events use an event-listings or venue "what's on" search URL; otherwise a Google Maps search link, e.g. https://www.google.com/maps/search/?api=1&query=<url-encoded venue and city>.
- Give realistic price ranges and a sensible start hour (24h) for each.
- Rank from best to worst fit and set confidenceScore accordingly (best ~0.9), but still keep the set varied.`,
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
