import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const source = /\.(?:[cm]?[jt]sx?)$/;
const skipped = new Set([".git", ".next", "node_modules", "coverage", "openspec", "docs", "design", ".claude"]);

export function findViolations(files) {
  const violations = [];
  for (const { path, content } of files) {
    const allowed = path.replaceAll("\\", "/").startsWith("lib/platform/adapters/supabase/");
    if (path === "vercel.json") {
      try {
        if (Object.hasOwn(JSON.parse(content), "crons")) {
          const line = content.slice(0, content.search(/"crons"/)).split("\n").length;
          violations.push(`${path}:${line}: Vercel crons are forbidden`);
        }
      } catch {
        violations.push(`${path}:1: invalid JSON`);
      }
      continue;
    }
    for (const [index, line] of content.split("\n").entries()) {
      const location = `${path}:${index + 1}`;
      if (/\b(?:import|from|require|export)\b/.test(line)) {
        if (/@vercel\/(?:kv|blob|edge-config|postgres)(?:[/'"]|$)/.test(line)) {
          violations.push(`${location}: Vercel storage import is forbidden`);
        }
        if (!allowed && /@supabase\/[\w-]+/.test(line)) {
          violations.push(`${location}: Supabase import outside adapter`);
        }
      }
      if (!allowed && /\b(?:auth\.(?:uid\(\)|jwt\(\)|users)|storage\.objects)(?![\w.])/.test(line)) {
        violations.push(`${location}: platform schema reference outside adapter`);
      }
    }
  }
  return violations;
}

async function collectFiles(root) {
  const files = new Map();
  async function walk(directory, includeSource = false, includeAll = false) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (skipped.has(entry.name)) continue;
        await walk(join(directory, entry.name), includeSource || ["app", "lib", "components", "scripts"].includes(entry.name), includeAll || ["sql", "migrations", "migration"].includes(entry.name));
      } else if (entry.isFile()) {
        const path = relative(root, join(directory, entry.name)).replaceAll("\\", "/");
        if (path === "vercel.json" || (includeSource && source.test(entry.name)) || (includeAll && (source.test(entry.name) || entry.name.endsWith(".sql"))) || entry.name.endsWith(".sql")) {
          files.set(path, await readFile(join(directory, entry.name), "utf8"));
        }
      }
    }
  }
  await walk(root);
  return [...files].map(([path, content]) => ({ path, content }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const violations = findViolations(await collectFiles(process.cwd()));
  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Portability check passed\n");
  }
}
