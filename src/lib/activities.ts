import { nanoid } from "nanoid";
import type { Activity, SearchPreferences } from "./types";

type Template = {
  title: string;
  emoji: string;
  description: string;
  priceRange: string;
  tags: string[];
  hour: number;
  durationHrs: number;
  keywords: string[];
};

const TEMPLATES: Template[] = [
  {
    title: "Bowling Night",
    emoji: "🎳",
    description: "Good for groups, indoor, relaxed evening activity.",
    priceRange: "€15/person",
    tags: ["groups", "indoor", "evening"],
    hour: 20,
    durationHrs: 2,
    keywords: ["fun", "friends", "group", "weekend", "rainy", "indoor"],
  },
  {
    title: "Escape Room",
    emoji: "🧩",
    description: "Team puzzle adventure, great for small groups.",
    priceRange: "€25/person",
    tags: ["groups", "indoor", "teamwork"],
    hour: 19,
    durationHrs: 1,
    keywords: ["fun", "friends", "group", "challenge", "rainy", "indoor"],
  },
  {
    title: "Cozy Dinner",
    emoji: "🍝",
    description: "Warm restaurant with a great shared-plates menu.",
    priceRange: "€30/person",
    tags: ["date", "indoor", "food"],
    hour: 19,
    durationHrs: 2,
    keywords: ["date", "dinner", "food", "romantic", "evening"],
  },
  {
    title: "Live Music Bar",
    emoji: "🎶",
    description: "Local bands and a buzzy atmosphere all night.",
    priceRange: "€10/person",
    tags: ["nightlife", "music", "evening"],
    hour: 21,
    durationHrs: 3,
    keywords: ["fun", "music", "night", "friends", "weekend"],
  },
  {
    title: "Brunch & Walk",
    emoji: "🥐",
    description: "Slow brunch followed by a scenic city stroll.",
    priceRange: "€18/person",
    tags: ["daytime", "casual", "outdoor"],
    hour: 11,
    durationHrs: 2,
    keywords: ["cheap", "casual", "day", "weekend", "outdoor"],
  },
  {
    title: "Museum Afternoon",
    emoji: "🖼️",
    description: "Rotating exhibitions, perfect for a rainy day.",
    priceRange: "€12/person",
    tags: ["culture", "indoor", "daytime"],
    hour: 14,
    durationHrs: 2,
    keywords: ["rainy", "indoor", "culture", "cheap", "day"],
  },
  {
    title: "Mini Golf",
    emoji: "⛳",
    description: "Playful 18-hole course, fun for all group sizes.",
    priceRange: "€12/person",
    tags: ["groups", "casual", "daytime"],
    hour: 15,
    durationHrs: 1,
    keywords: ["fun", "cheap", "group", "friends", "day"],
  },
  {
    title: "Sunset Picnic",
    emoji: "🧺",
    description: "Bring snacks to the park for a golden-hour hangout.",
    priceRange: "Free",
    tags: ["outdoor", "casual", "cheap"],
    hour: 18,
    durationHrs: 2,
    keywords: ["cheap", "free", "outdoor", "date", "friends", "weekend"],
  },
  {
    title: "Cocktail Workshop",
    emoji: "🍹",
    description: "Learn to mix three signature drinks with a host.",
    priceRange: "€35/person",
    tags: ["groups", "indoor", "evening"],
    hour: 20,
    durationHrs: 2,
    keywords: ["fun", "group", "friends", "night", "weekend"],
  },
  {
    title: "Climbing Gym",
    emoji: "🧗",
    description: "Indoor bouldering for beginners and pros alike.",
    priceRange: "€20/person",
    tags: ["active", "indoor", "groups"],
    hour: 17,
    durationHrs: 2,
    keywords: ["active", "fun", "group", "rainy", "indoor"],
  },
];

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Rotterdam: { lat: 51.9244, lng: 4.4777 },
  Utrecht: { lat: 52.0907, lng: 5.1214 },
  London: { lat: 51.5074, lng: -0.1278 },
  Berlin: { lat: 52.52, lng: 13.405 },
  "your area": { lat: 52.3676, lng: 4.9041 },
};

export function cityCoords(location: string): { lat: number; lng: number } {
  return CITY_COORDS[location] ?? CITY_COORDS["your area"];
}

/**
 * Resolve the base calendar day for a plan from a loose date preference.
 *
 * When nothing is specified we intentionally default to *today* (and let
 * {@link startTimeFor} roll any already-passed activities to the next day) so
 * plans land today or in the very near future, rather than jumping to the
 * weekend. Explicit hints ("tomorrow", "this weekend", "sunday", …) are honored.
 */
export function resolveBaseDate(preference: string | null): Date {
  const now = new Date();
  const result = new Date(now);
  const pref = (preference ?? "").toLowerCase();

  if (pref.includes("tomorrow")) {
    result.setDate(now.getDate() + 1);
  } else if (pref.includes("sunday") || pref.includes("sun")) {
    const daysUntilSun = (7 - now.getDay()) % 7;
    result.setDate(now.getDate() + daysUntilSun);
  } else if (
    pref.includes("weekend") ||
    pref.includes("saturday") ||
    pref.includes("sat")
  ) {
    // Upcoming Saturday (today if it's already Saturday).
    const daysUntilSat = (6 - now.getDay() + 7) % 7;
    result.setDate(now.getDate() + daysUntilSat);
  }
  // Default (incl. "today"/"tonight" or no preference): keep today.
  return result;
}

/**
 * Build a concrete start time for an activity on the given base day. When the
 * plan is for *today* and the chosen hour has already passed, roll the activity
 * to the same hour tomorrow so suggestions always sit in the near future.
 */
function startTimeFor(baseDate: Date, hour: number): Date {
  const now = new Date();
  const start = new Date(baseDate);
  start.setHours(Math.min(23, Math.max(0, Math.round(hour))), 0, 0, 0);

  const isToday = baseDate.toDateString() === now.toDateString();
  if (isToday && start.getTime() <= now.getTime()) {
    start.setDate(start.getDate() + 1);
  }
  return start;
}

function scoreTemplate(t: Template, prefs: SearchPreferences): number {
  const haystack = [
    prefs.activityType ?? "",
    prefs.dateTimePreference ?? "",
    prefs.budget ?? "",
    ...(prefs.preferences ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0.5;
  for (const kw of t.keywords) {
    if (haystack.includes(kw)) score += 0.12;
  }
  if ((prefs.budget ?? "").toLowerCase().includes("cheap")) {
    if (t.priceRange === "Free") score += 0.2;
    else if (/€1?\d\//.test(t.priceRange)) score += 0.1;
    else score -= 0.1;
  }
  return Math.min(0.98, Math.max(0.4, score));
}

export function generateActivities(
  prefs: SearchPreferences,
  resolvedLocation: string
): Activity[] {
  const coords =
    CITY_COORDS[resolvedLocation] ?? CITY_COORDS["your area"];
  const baseDate = resolveBaseDate(prefs.dateTimePreference);

  const ranked = TEMPLATES.map((t) => ({ t, score: scoreTemplate(t, prefs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return ranked.map(({ t, score }, i) => {
    const start = startTimeFor(baseDate, t.hour);
    const end = new Date(start);
    end.setHours(start.getHours() + t.durationHrs);

    return {
      id: nanoid(10),
      title: `${t.title} ${resolvedLocation}`,
      emoji: t.emoji,
      description: t.description,
      locationName: resolvedLocation,
      latitude: coords.lat + (i - 3) * 0.004,
      longitude: coords.lng + (i - 3) * 0.004,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      priceRange: t.priceRange,
      sourceUrl: "",
      confidenceScore: Number(score.toFixed(2)),
      tags: t.tags,
    } satisfies Activity;
  });
}

export type ActivityIdea = {
  title: string;
  emoji: string;
  description: string;
  locationName: string;
  latitude?: number | null;
  longitude?: number | null;
  startHour: number;
  durationHrs: number;
  priceRange: string;
  sourceUrl?: string | null;
  confidenceScore?: number | null;
  tags: string[];
};

/**
 * Turn loosely-structured activity ideas (e.g. produced by the AI model) into
 * fully-formed Activity objects. Timestamps are computed deterministically from
 * the date preference so the model never has to reason about dates/timezones,
 * and missing coordinates fall back to the resolved city centre.
 */
export function buildActivities(
  ideas: ActivityIdea[],
  prefs: SearchPreferences,
  resolvedLocation: string
): Activity[] {
  const coords = cityCoords(resolvedLocation);
  const baseDate = resolveBaseDate(prefs.dateTimePreference);

  return ideas.map((idea, i) => {
    const hour = Number.isFinite(idea.startHour) ? idea.startHour : 19;
    const duration =
      Number.isFinite(idea.durationHrs) && idea.durationHrs > 0
        ? idea.durationHrs
        : 2;

    const start = startTimeFor(baseDate, hour);
    const end = new Date(start);
    end.setHours(start.getHours() + duration);

    const lat =
      typeof idea.latitude === "number" && Number.isFinite(idea.latitude)
        ? idea.latitude
        : coords.lat + (i - 3) * 0.004;
    const lng =
      typeof idea.longitude === "number" && Number.isFinite(idea.longitude)
        ? idea.longitude
        : coords.lng + (i - 3) * 0.004;

    return {
      id: nanoid(10),
      title: idea.title,
      emoji: idea.emoji || "📍",
      description: idea.description,
      locationName: idea.locationName || resolvedLocation,
      latitude: lat,
      longitude: lng,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      priceRange: idea.priceRange || "Varies",
      sourceUrl: idea.sourceUrl ?? "",
      confidenceScore:
        typeof idea.confidenceScore === "number"
          ? Number(idea.confidenceScore.toFixed(2))
          : 0.7,
      tags: idea.tags ?? [],
    } satisfies Activity;
  });
}

export function fallbackPreferences(prompt: string): SearchPreferences {
  const p = prompt.toLowerCase();
  const preferences: string[] = [];
  for (const kw of [
    "indoor",
    "outdoor",
    "rainy",
    "date",
    "group",
    "friends",
    "cheap",
    "fun",
    "active",
    "food",
    "music",
  ]) {
    if (p.includes(kw)) preferences.push(kw);
  }

  let dateTime: string | null = null;
  if (p.includes("weekend")) dateTime = "this weekend";
  else if (p.includes("tonight") || p.includes("today")) dateTime = "today";
  else if (p.includes("tomorrow")) dateTime = "tomorrow";

  return {
    activityType: preferences[0] ?? null,
    location: extractLocation(prompt),
    dateTimePreference: dateTime,
    budget: p.includes("cheap") || p.includes("free") ? "cheap" : null,
    groupSize: p.includes("date")
      ? "2"
      : p.includes("group") || p.includes("friends")
        ? "group"
        : null,
    preferences,
  };
}

export function extractLocation(prompt: string): string | null {
  const match = prompt.match(/\bin ([A-Z][a-zA-Z]+)/);
  if (match && CITY_COORDS[match[1]]) return match[1];
  return null;
}
