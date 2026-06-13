import { NextResponse } from "next/server";
import { z } from "zod";
import { recordResponse } from "@/lib/store";

const bodySchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(60),
  response: z.enum(["accepted", "declined", "suggested"]),
  suggestion: z.string().max(500).optional().nullable(),
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
      { error: "Please add your name and a response." },
      { status: 400 }
    );
  }

  const plan = await recordResponse(parsed.data);
  if (!plan) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
