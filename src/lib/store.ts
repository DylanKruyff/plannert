import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { prisma, hasDatabase } from "./prisma";
import type {
  Activity,
  PlanStatus,
  PlanView,
  ProposalStatus,
  ResponseRecord,
  ResponseType,
  TimeProposal,
} from "./types";

/**
 * Data access for plans / invites / responses.
 *
 * Uses Prisma + PostgreSQL when DATABASE_URL is configured. Otherwise falls
 * back to a local JSON file so the app stays fully functional in development
 * without a database server.
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
  responses: ResponseRecord[];
  proposals: TimeProposal[];
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
    responses: plan.responses,
    proposals: plan.proposals ?? [],
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
      include: { invites: { include: { responses: true, proposals: true } } },
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
    responses: [],
    proposals: [],
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
      include: { invites: { include: { responses: true, proposals: true } } },
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
      include: { plan: { include: { invites: { include: { responses: true, proposals: true } } } } },
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
      include: { invites: { include: { responses: true, proposals: true } } },
    });
    return plan ? prismaToView(plan) : null;
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.id === id);
  return plan ? toView(plan) : null;
}

export async function recordResponse(input: {
  token: string;
  name: string;
  response: ResponseType;
  suggestion?: string | null;
}): Promise<PlanView | null> {
  const { token, name, response, suggestion = null } = input;

  if (hasDatabase) {
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite) return null;
    await prisma.response.create({
      data: { inviteId: invite.id, name, response, suggestion },
    });
    return getPlanByToken(token);
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.token === token);
  if (!plan) return null;
  plan.responses.push({
    id: nanoid(8),
    name,
    response,
    suggestion,
    createdAt: new Date().toISOString(),
  });
  await writeFileStore(store);
  return toView(plan);
}

export async function createProposal(input: {
  token: string;
  name: string;
  proposedStart: string;
  proposedEnd: string;
  message?: string | null;
}): Promise<PlanView | null> {
  const { token, name, proposedStart, proposedEnd, message = null } = input;

  if (hasDatabase) {
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite) return null;
    await prisma.proposal.create({
      data: {
        inviteId: invite.id,
        name,
        proposedStart: new Date(proposedStart),
        proposedEnd: new Date(proposedEnd),
        message,
        status: "pending",
      },
    });
    return getPlanByToken(token);
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.token === token);
  if (!plan) return null;
  plan.proposals.push({
    id: nanoid(8),
    name,
    proposedStart,
    proposedEnd,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await writeFileStore(store);
  return toView(plan);
}

/**
 * Owner allows or declines a friend's date/time proposal.
 *
 * Allowing auto-accepts the friend, declining auto-declines them — the friend
 * never has to respond twice. Re-deciding an already-resolved proposal is a
 * no-op so a double click can't create duplicate responses.
 */
export async function decideProposal(input: {
  proposalId: string;
  decision: "allow" | "decline";
}): Promise<PlanView | null> {
  const { proposalId, decision } = input;
  const status: ProposalStatus = decision === "allow" ? "allowed" : "declined";
  const response: ResponseType = decision === "allow" ? "accepted" : "declined";

  if (hasDatabase) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { invite: true },
    });
    if (!proposal) return null;
    if (proposal.status !== "pending") {
      return getPlanById(proposal.invite.planId);
    }
    await prisma.$transaction([
      prisma.proposal.update({ where: { id: proposalId }, data: { status } }),
      prisma.response.create({
        data: { inviteId: proposal.inviteId, name: proposal.name, response },
      }),
    ]);
    return getPlanById(proposal.invite.planId);
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) =>
    p.proposals.some((pr) => pr.id === proposalId)
  );
  if (!plan) return null;
  const proposal = plan.proposals.find((pr) => pr.id === proposalId);
  if (!proposal) return null;
  if (proposal.status !== "pending") return toView(plan);
  proposal.status = status;
  plan.responses.push({
    id: nanoid(8),
    name: proposal.name,
    response,
    suggestion: null,
    createdAt: new Date().toISOString(),
  });
  await writeFileStore(store);
  return toView(plan);
}

export async function updatePlanActivity(
  id: string,
  activity: Activity
): Promise<PlanView | null> {
  if (hasDatabase) {
    const plan = await prisma.plan.update({
      where: { id },
      data: { activityJson: activity as unknown as object },
      include: { invites: { include: { responses: true, proposals: true } } },
    });
    return prismaToView(plan);
  }

  const store = await readFileStore();
  const plan = store.plans.find((p) => p.id === id);
  if (!plan) return null;
  plan.activity = activity;
  await writeFileStore(store);
  return toView(plan);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function prismaToView(plan: any): PlanView {
  const invite = plan.invites?.[0];
  const responses: ResponseRecord[] = (invite?.responses ?? []).map(
    (r: any) => ({
      id: r.id,
      name: r.name,
      response: r.response as ResponseType,
      suggestion: r.suggestion ?? null,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })
  );
  const proposals: TimeProposal[] = (invite?.proposals ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    proposedStart:
      p.proposedStart instanceof Date
        ? p.proposedStart.toISOString()
        : p.proposedStart,
    proposedEnd:
      p.proposedEnd instanceof Date
        ? p.proposedEnd.toISOString()
        : p.proposedEnd,
    message: p.message ?? null,
    status: p.status as ProposalStatus,
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  }));

  return {
    id: plan.id,
    creatorId: plan.creatorId,
    creatorName: plan.creatorName,
    activity: plan.activityJson as Activity,
    status: plan.status as PlanStatus,
    inviteToken: invite?.token ?? "",
    responses,
    proposals,
    createdAt:
      plan.createdAt instanceof Date
        ? plan.createdAt.toISOString()
        : plan.createdAt,
  };
}
