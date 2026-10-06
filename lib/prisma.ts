import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // Capped pool size: on Vercel this code runs in many concurrent serverless
  // function instances, each with its own pool. The pg.Pool default (10) per
  // instance would multiply across instances fast enough to hit Neon's
  // connection limit under real concurrent traffic; 5 leaves headroom while
  // still allowing some per-instance parallelism.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
