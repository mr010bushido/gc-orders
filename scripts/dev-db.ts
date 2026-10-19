// Local database commands: node scripts/dev-db.ts setup|up|down|reset
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isComposeDevDatabaseUrl, mergeLocalEnv } from "./dev-env.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const envFile = `${root}.env.local`;
const composeFile = `${root}compose.yaml`;

function run(command: string, args: string[]): void {
  // Argument arrays, no shell: env values are never interpolated into a command line.
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error(`${command} ${args.join(" ")} failed: ${result.error?.message ?? `exit ${result.status}`}`);
    process.exit(result.status || 1);
  }
}

const compose = (...args: string[]) => run("docker", ["compose", "-f", composeFile, "-p", "gc-orders", ...args]);

/** Loads `.env.local` without overriding variables that are already exported. */
function loadEnv(): void {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

/** Creates `.env.local` if missing; otherwise appends only absent keys. Never rewrites existing content. */
function prepareEnv(): void {
  const secret = randomBytes(32).toString("hex");
  if (!existsSync(envFile)) {
    writeFileSync(envFile, mergeLocalEnv("", secret), { flag: "wx", mode: 0o600 });
    console.log("created .env.local");
  } else {
    const existing = readFileSync(envFile, "utf8");
    const merged = mergeLocalEnv(existing, secret);
    if (merged !== existing) {
      appendFileSync(envFile, merged.slice(existing.length));
      console.log("added missing local keys to .env.local (existing keys untouched)");
    }
  }
  loadEnv();
}

/** Refuses, before anything runs, unless migrate and seed would target this project's compose dev database. */
function requireComposeDevDatabase(): void {
  const urls = [process.env.DATABASE_URL, process.env.DATABASE_MIGRATION_URL].filter(Boolean);
  if (urls.length === 0 || !urls.every(isComposeDevDatabaseUrl)) {
    console.error(
      "Refusing: DATABASE_URL and DATABASE_MIGRATION_URL must point at the compose dev database on 127.0.0.1:5435 (database cakes), and at least one must be set. Nothing was changed.",
    );
    process.exit(1);
  }
}

function migrateAndSeed(): void {
  run("pnpm", ["db:migrate"]);
  run("pnpm", ["db:seed"]);
}

const commands: Record<string, () => void> = {
  setup() {
    prepareEnv();
    requireComposeDevDatabase();
    compose("up", "-d", "--wait", "postgres");
    migrateAndSeed();
    console.log("Local database ready on 127.0.0.1:5435. Run: pnpm dev");
  },
  up() {
    compose("up", "-d", "--wait", "postgres");
  },
  down() {
    compose("down");
  },
  reset() {
    loadEnv();
    requireComposeDevDatabase();
    compose("down", "-v");
    compose("up", "-d", "--wait", "postgres");
    migrateAndSeed();
  },
};

const command = commands[process.argv[2] ?? ""];
if (!command) {
  console.error(`Usage: node scripts/dev-db.ts ${Object.keys(commands).join("|")}`);
  process.exit(2);
}
command();
