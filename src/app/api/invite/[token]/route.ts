import { NextResponse } from "next/server";
import { getPlanByToken } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const plan = await getPlanByToken(token);
  if (!plan) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  return NextResponse.json({ plan });
}
