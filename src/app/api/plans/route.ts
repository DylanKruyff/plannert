import { NextResponse } from "next/server";
import { getPlansByCreator } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");

  if (!creatorId) {
    return NextResponse.json({ plans: [] });
  }

  const plans = await getPlansByCreator(creatorId);
  return NextResponse.json({ plans });
}
