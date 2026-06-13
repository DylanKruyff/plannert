import { NextResponse } from "next/server";
import { z } from "zod";
import { createProposal } from "@/lib/store";

const bodySchema = z
  .object({
    token: z.string().min(1),
    name: z.string().min(1).max(60),
    proposedStart: z.string().datetime(),
    proposedEnd: z.string().datetime(),
    message: z.string().max(500).optional().nullable(),
  })
  .refine((b) => new Date(b.proposedEnd) > new Date(b.proposedStart), {
    message: "End time must be after start time.",
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
      { error: "Please add your name and a valid new date/time." },
      { status: 400 }
    );
  }

  const plan = await createProposal(parsed.data);
  if (!plan) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
