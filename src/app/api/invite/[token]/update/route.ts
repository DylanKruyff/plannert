import { NextResponse } from "next/server";
import { z } from "zod";
import { updatePlanActivityByToken } from "@/lib/store";
import type { Activity } from "@/lib/types";

const activitySchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  emoji: z.string(),
  description: z.string(),
  locationName: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  priceRange: z.string(),
  sourceUrl: z.string(),
  confidenceScore: z.number(),
  tags: z.array(z.string()),
});

const bodySchema = z.object({ activity: activitySchema });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Could not update this plan." },
      { status: 400 }
    );
  }

  const plan = await updatePlanActivityByToken(
    token,
    parsed.data.activity as Activity
  );
  if (!plan) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
