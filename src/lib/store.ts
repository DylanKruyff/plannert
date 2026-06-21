import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { prisma, hasDatabase } from "./prisma";
import type { Activity, PlanStatus, PlanView } from "./types";

/**
 * Data access for plans / invites.
 *
 * Uses Prisma + PostgreSQL when DATABASE_URL is configured. Otherwise falls
 * back to a local JSON file so the app stays fully functional in development
 * without a database server.
 *
 * Negotiation happens in the group chat, so the only mutation an invite link
 * grants is editing the plan itself (date/time or the whole activity).
 */

const DATA_DIR = path.join(process.cwd(), ".plannert-data");
const DATA_FILE = path.join(DATA_DIR, "plans.json");

type StoredPlan = {
  id: string;
  creatorId: string;
  creatorName: string;
  activity: Activity;
  status: PlanStatus;
  token: string;
  createdAt: string;
};

type FileShape = { plans: StoredPlan[] };

async function readFileStore(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as FileShape;
  } catch {
    return { plans: [] };
  }
}

async function writeFileStore(data: FileShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function computeStatus(plan: StoredPlan): PlanStatus {
  return plan.status;
}

function toView(plan: StoredPlan): PlanView {
  return {
    id: plan.id,
    creatorId: plan.creatorId,
    creatorName: plan.creatorName,
    activity: plan.activity,
    status: computeStatus(plan),
    inviteToken: plan.token,
    createdAt: plan.createdAt,
  };
}

export async function createPlan(
  activity: Activity,
  creatorName: string,
  creatorId: string
): Promise<PlanView> {
  const token = nanoid(8);

  if (hasDatabase) {
    const plan = await prisma.plan.create({
      data: {
        creatorId,
        creatorName,
        activityJson: activity as unknown as object,
        status: "open",
        invites: { create: { token } },
      },
      include: { invites: true },
    });
    return prismaToView(plan);
  }

  const store = await readFileStore();
  const stored: StoredPlan = {
    id: nanoid(8),
    creatorId,
    creatorName,
    activity,
    status: "open",
    token,
    createdAt: new Date().toISOString(),
  };
  store.plans.push(stored);
  await writeFileStore(store);
  return toView(stored);
}

export async function getPlansByCreator(
  creatorId: string
): Promise<PlanView[]> {
  if (hasDatabase) {
    const plans = await prisma.plan.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
      include: { invites: true },
    });
    return plans.map(prismaToView);
  }

  const store = await readFileStore();
  return store.plans
    .filter((p) => p.creatorId === creatorId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map(toView);
}

export async function getPlanByToken(token: string): Promise<PlanView | null> {
  if (hasDatabase) {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { plan: { include: { invites: true } } },
    });
    if (!invite) return null;
    return prismaToView(invite.plan);
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.token === token);
  return plan ? toView(plan) : null;
}

export async function getPlanById(id: string): Promise<PlanView | null> {
  if (hasDatabase) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: { invites: true },
    });
    return plan ? prismaToView(plan) : null;
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.id === id);
  return plan ? toView(plan) : null;
}

/**
 * Replaces a plan's activity. Anyone holding the invite link is allowed to do
 * this — that's the whole point of the new flow: if you can't make it, you
 * change the plan and re-share it with the group.
 */
export async function updatePlanActivityByToken(
  token: string,
  activity: Activity
): Promise<PlanView | null> {
  if (hasDatabase) {
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite) return null;
    const plan = await prisma.plan.update({
      where: { id: invite.planId },
      data: { activityJson: activity as unknown as object },
      include: { invites: true },
    });
    return prismaToView(plan);
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.token === token);
  if (!plan) return null;
  plan.activity = activity;
  await writeFileStore(store);
  return toView(plan);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function prismaToView(plan: any): PlanView {
  const invite = plan.invites?.[0];

  return {
    id: plan.id,
    creatorId: plan.creatorId,
    creatorName: plan.creatorName,
    activity: plan.activityJson as Activity,
    status: plan.status as PlanStatus,
    inviteToken: invite?.token ?? "",
    createdAt:
      plan.createdAt instanceof Date
        ? plan.createdAt.toISOString()
        : plan.createdAt,
  };
}
