import { NextResponse } from "next/server";
import { getPlanById } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await getPlanById(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }
  return NextResponse.json({ plan });
}
