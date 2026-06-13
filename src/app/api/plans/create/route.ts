import { NextResponse } from "next/server";
import { z } from "zod";
import { createPlan } from "@/lib/store";
import type { Activity } from "@/lib/types";

const activitySchema = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string(),
  description: z.string(),
  locationName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  priceRange: z.string(),
  sourceUrl: z.string(),
  confidenceScore: z.number(),
  tags: z.array(z.string()),
});

const bodySchema = z.object({
  activity: activitySchema,
  creatorName: z.string().min(1).max(60).optional(),
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
      { error: "Could not create plan from this activity." },
      { status: 400 }
    );
  }

  try {
    const plan = await createPlan(
      parsed.data.activity as Activity,
      parsed.data.creatorName?.trim() || "A friend"
    );
    return NextResponse.json({
      planId: plan.id,
      token: plan.inviteToken,
      inviteUrl: `/i/${plan.inviteToken}`,
    });
  } catch (err) {
    console.error("createPlan failed", err);
    return NextResponse.json(
      { error: "Something went wrong creating the plan." },
      { status: 500 }
    );
  }
}
