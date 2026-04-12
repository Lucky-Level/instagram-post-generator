#!/usr/bin/env node
/**
 * Migration runner for Post Agent Supabase database.
 * Usage:
 *   node scripts/run-migration.mjs <file.sql>       — run a specific migration
 *   node scripts/run-migration.mjs --all             — run all migrations in order
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const DB_URL =
  "postgresql://postgres:Abdu817567!@db.owkvgdjcobmuacnztzee.supabase.co:5432/postgres";
const MIGRATIONS_DIR = resolve("supabase/migrations");

function runSQL(sql, label) {
  console.log(`\n→ Running: ${label}`);
  try {
    const result = execSync(`psql "${DB_URL}" -v ON_ERROR_STOP=1`, {
      input: sql,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(result || "  (done)");
  } catch (err) {
    console.error(`  ERROR in ${label}:`);
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);

if (args[0] === "--all") {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  console.log(`Found ${files.length} migration(s):`);
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    runSQL(sql, file);
  }
  console.log("\n✓ All migrations applied.");
} else if (args[0]) {
  const filePath = args[0].includes("/")
    ? resolve(args[0])
    : join(MIGRATIONS_DIR, args[0]);
  const sql = readFileSync(filePath, "utf-8");
  runSQL(sql, args[0]);
  console.log("\n✓ Migration applied.");
} else {
  console.log("Usage:");
  console.log("  node scripts/run-migration.mjs <file.sql>");
  console.log("  node scripts/run-migration.mjs --all");
}
