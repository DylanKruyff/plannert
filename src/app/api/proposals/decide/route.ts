import { NextResponse } from "next/server";
import { z } from "zod";
import { decideProposal } from "@/lib/store";

const bodySchema = z.object({
  proposalId: z.string().min(1),
  decision: z.enum(["allow", "decline"]),
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = await decideProposal(parsed.data);
  if (!plan) {
    return NextResponse.json(
      { error: "Suggestion not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ plan });
}
