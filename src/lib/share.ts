import type { Activity } from "./types";
import { formatDay, formatTime } from "./utils";

/**
 * Builds the WhatsApp/share message for a plan.
 *
 * The whole negotiation now happens in the chat, so the copy has to do two
 * jobs: tell people to thumbs-up (or reply) if they're in, and tell anyone who
 * can't make it to tap the link and change the plan themselves.
 */
export function buildShareText(activity: Activity, inviteUrl: string): string {
  const when = `${formatDay(activity.startTime)} at ${formatTime(
    activity.startTime
  )}`;

  return [
    "🎉 Let's meet up!",
    "",
    `${activity.emoji} ${activity.title}`,
    `📍 ${activity.locationName}`,
    `🗓️ ${when}`,
    "",
    "👍 In? Just give this a thumbs up.",
    `✏️ Want a different time or plan? Tap the link to suggest a change: ${inviteUrl}`,
  ].join("\n");
}

export function buildWhatsappUrl(
  activity: Activity,
  inviteUrl: string
): string {
  return `https://wa.me/?text=${encodeURIComponent(
    buildShareText(activity, inviteUrl)
  )}`;
}
