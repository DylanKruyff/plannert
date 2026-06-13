import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  (hasDatabase
    ? new PrismaClient({ log: ["error"] })
    : (undefined as unknown as PrismaClient));

if (process.env.NODE_ENV !== "production" && hasDatabase) {
  globalForPrisma.prisma = prisma;
}
