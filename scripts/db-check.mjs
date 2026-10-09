// Build-time schema drift check.
//
// Compares the live database (DIRECT_URL, via prisma.config.ts) to
// prisma/schema.prisma and fails if they differ, so a deploy can never ship a
// client that expects columns the database doesn't have.
//
// - Production deploys (VERCEL_ENV=production) or --require: a missing
//   DIRECT_URL fails the build, so production never ships unchecked.
// - Preview deploys and local builds: if DIRECT_URL is set the check runs,
//   otherwise it warns and skips. Previews usually don't get production
//   database secrets, and they shouldn't be blocked for it.
import "dotenv/config";
import { spawnSync } from "node:child_process";

const required = process.argv.includes("--require") || process.env.VERCEL_ENV === "production";

if (!process.env.DIRECT_URL) {
  if (required) {
    console.error("db-check: DIRECT_URL is not set. Add it to the environment (Sensitive, server-only).");
    process.exit(1);
  }
  console.warn(`db-check: DIRECT_URL not set, skipping schema drift check (${process.env.VERCEL_ENV || "local"} build).`);
  process.exit(0);
}

const args = [
  "prisma",
  "migrate",
  "diff",
  "--from-config-datasource",
  "--to-schema",
  "prisma/schema.prisma",
  "--exit-code",
];

const result = spawnSync("npx", args, { stdio: "inherit" });

if (result.status === 0) {
  console.log("db-check: database matches schema.prisma.");
  process.exit(0);
}
if (result.status === 2) {
  console.error(
    "db-check: the database does not match schema.prisma. Apply pending migrations with the owner role, then rebuild.",
  );
  process.exit(1);
}
console.error("db-check: could not compare the database to schema.prisma.");
process.exit(1);
