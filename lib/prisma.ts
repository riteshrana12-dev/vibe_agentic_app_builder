// lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not defined in your environment variables.",
    );
  }
  const pool = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter: pool });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
