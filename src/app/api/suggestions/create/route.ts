import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSuggestions } from "@/lib/ai";

const bodySchema = z.object({
  activityTitle: z.string().min(1),
  locationName: z.string().min(1),
  reason: z.string().max(300).optional().default(""),
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
      { error: "Missing activity details." },
      { status: 400 }
    );
  }

  const suggestions = await generateSuggestions({
    activityTitle: parsed.data.activityTitle,
    locationName: parsed.data.locationName,
    reason: parsed.data.reason || "Can't make this one",
  });

  return NextResponse.json({ suggestions });
}
