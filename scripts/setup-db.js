/**
 * Ensures DATABASE_URL is set before running prisma generate / push.
 * Defaults to local SQLite for zero-config dev.
 *
 * Used by postinstall, db:push, db:migrate.
 */
const { spawnSync } = require("child_process");

const FALLBACK = "file:./prisma/dev.db";
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = FALLBACK;
  console.log("[setup] DATABASE_URL not set, defaulting to " + FALLBACK);
}

const args = process.argv.slice(2);
const cmd = args[0] || "generate";
const extra = args.slice(1);

const result = spawnSync("npx", ["prisma", cmd, ...extra], {
  stdio: "inherit",
  env: process.env
});
process.exit(result.status ?? 1);
