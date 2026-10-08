import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Capped pool: on Vercel every concurrent function instance gets its own pool.
  // pg's default of 10 per instance multiplies fast enough to hit Neon's
  // connection limit; 5 leaves headroom.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
