import type { PlanView, ResponseRecord, ResponseType } from "./types";

export type PlanSummary = {
  latest: ResponseRecord[];
  accepted: number;
  declined: number;
  suggested: number;
  total: number;
  headline: string;
};

/** Keep only each person's most recent response (dedupe by name). */
export function latestResponses(plan: PlanView): ResponseRecord[] {
  const byName = new Map<string, ResponseRecord>();
  for (const r of plan.responses) {
    byName.set(r.name.toLowerCase(), r);
  }
  return [...byName.values()].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
  );
}

export function summarize(plan: PlanView): PlanSummary {
  const latest = latestResponses(plan);
  const count = (t: ResponseType) =>
    latest.filter((r) => r.response === t).length;

  const accepted = count("accepted");
  const declined = count("declined");
  const suggested = count("suggested");
  const total = latest.length;

  let headline: string;
  if (total === 0) {
    headline = "Waiting for the first reply";
  } else if (declined > 0 || suggested > 0) {
    const names = latest
      .filter((r) => r.response !== "accepted")
      .map((r) => r.name);
    headline =
      suggested > 0
        ? `${names.join(", ")} suggested a change`
        : `${names.join(", ")} can't make it`;
  } else {
    headline = `${accepted} ${accepted === 1 ? "person is" : "people are"} in!`;
  }

  return { latest, accepted, declined, suggested, total, headline };
}
