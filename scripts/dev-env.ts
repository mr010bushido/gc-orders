// Pure helpers for scripts/dev-db.ts. The credentials are the fixed local-only ones from compose.yaml.
export const LOCAL_DATABASE_URL = "postgres://cakes:local-cakes-only@127.0.0.1:5435/cakes";
export const LOCAL_APP_URL = "http://localhost:3000";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** True only when the URL parses and its effective host is this machine. */
export function isLocalDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // postgres.js lets `?host=` / `?hostaddr=` override the authority, so they must not smuggle a remote host in.
  if (url.searchParams.has("host") || url.searchParams.has("hostaddr")) return false;
  return LOCAL_HOSTS.has(url.hostname.toLowerCase());
}

/** The full default `.env.local` for a given random `JOBS_SECRET`. */
export function renderLocalEnv(jobsSecret: string): string {
  return mergeLocalEnv("", jobsSecret);
}

/** `existing` plus any default key it lacks. Existing text and keys are never changed, only appended to. */
export function mergeLocalEnv(existing: string, jobsSecret: string): string {
  const present = new Set(
    [...existing.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((match) => match[1]),
  );
  const defaults: [string, string][] = [
    ["DATABASE_URL", LOCAL_DATABASE_URL],
    ["DATABASE_MIGRATION_URL", LOCAL_DATABASE_URL],
    ["APP_URL", LOCAL_APP_URL],
    ["JOBS_SECRET", jobsSecret],
  ];
  const added = defaults.filter(([key]) => !present.has(key)).map(([key, value]) => `${key}=${value}\n`);
  if (added.length === 0) return existing;
  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  return existing + separator + added.join("");
}
