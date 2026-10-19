import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ownerRoot = join(process.cwd(), "app/owner");
const publicHandlers = new Set(["login/actions.ts", "login/page.tsx", "auth/callback/route.ts"]);
const routeVerbs = ["GET", "POST", "PUT", "PATCH", "DELETE"];

type SourceMap = Map<string, string>;
type Callable = { name: string; body: ts.Node | null };

const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
const isDefault = (node: ts.Node) =>
  ts.canHaveModifiers(node) && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));

/** Every exported function-like thing; a re-export or an exported value that is not a function has no visible body (null). */
function exportedCallables(source: ts.SourceFile): Callable[] {
  const found: Callable[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
      found.push({ name: isDefault(statement) ? "default" : statement.name?.text ?? "default", body: statement.body ?? null });
    } else if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const init = declaration.initializer;
        const isFunction = init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
        found.push({ name: declaration.name.getText(source), body: isFunction ? init.body : null });
      }
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const names = statement.exportClause && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.filter((element) => !element.isTypeOnly).map((element) => element.name.text)
        : ["*"];
      for (const name of names) found.push({ name, body: null });
    } else if (ts.isExportAssignment(statement)) {
      const init = statement.expression;
      found.push({ name: "default", body: ts.isArrowFunction(init) || ts.isFunctionExpression(init) ? init.body : null });
    }
  }
  return found;
}

function callsRequireOwnerFirst(body: ts.Node | null): boolean {
  if (!body || !ts.isBlock(body)) return false;
  const first = body.statements.find((statement) =>
    !ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression),
  );
  if (!first || !ts.isExpressionStatement(first) || !ts.isAwaitExpression(first.expression)) return false;
  const awaited = first.expression.expression;
  return ts.isCallExpression(awaited) && ts.isIdentifier(awaited.expression) && awaited.expression.text === "requireOwner";
}

function findUnguardedOwnerHandlers(files: SourceMap): string[] {
  const violations: string[] = [];
  for (const [path, contents] of files) {
    const normalized = path.replaceAll("\\", "/");
    if (publicHandlers.has(normalized)) continue;
    const source = ts.createSourceFile(normalized, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const isActionModule = source.statements.some((statement) =>
      ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === "use server",
    );
    const file = normalized.split("/").at(-1) ?? "";
    const checked = exportedCallables(source).filter(({ name }) => {
      if (isActionModule) return true;
      if (/^route\.tsx?$/.test(file)) return routeVerbs.includes(name);
      if (/^(page|layout)\.tsx?$/.test(file)) return name === "default";
      return false;
    });
    for (const { name, body } of checked) {
      if (!callsRequireOwnerFirst(body)) violations.push(`${normalized}:${name}`);
    }
  }
  return violations;
}

function readOwnerSources(directory: string, files = new Map<string, string>()): SourceMap {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) readOwnerSources(fullPath, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.set(relative(ownerRoot, fullPath), readFileSync(fullPath, "utf8"));
  }
  return files;
}

describe("owner route guard coverage", () => {
  it.each([
    ["an exported function action", '"use server"; export async function deleteOrders() { return true; }', "orders/actions.ts:deleteOrders"],
    ["an exported arrow action", '"use server"; export const wipe = async () => true;', "orders/actions.ts:wipe"],
    ["a re-exported action", '"use server"; export { wipe } from "./elsewhere";', "orders/actions.ts:wipe"],
    ["a route handler", "export async function POST() { return new Response(); }", "orders/route.ts:POST"],
    ["a page", "export default function Page() { return null; }", "orders/page.tsx:default"],
  ])("rejects %s without requireOwner", (_label, code, violation) => {
    const file = violation.split(":")[0];
    expect(findUnguardedOwnerHandlers(new Map([[file, code]]))).toEqual([violation]);
  });

  it("accepts a handler that calls requireOwner", () => {
    const fixture = new Map([["orders/actions.ts", '"use server"; export async function ok() { await requireOwner(); }']]);
    expect(findUnguardedOwnerHandlers(fixture)).toEqual([]);
  });

  it("accepts first-statement guards in actions, route handlers, pages and layouts", () => {
    const fixtures = new Map([
      ["orders/actions.ts", '"use server"; export const update = async () => { await requireOwner(); return true; };'],
      ["orders/route.ts", "export async function POST() { await requireOwner(); return new Response(); }"],
      ["orders/page.tsx", "export default async function Page() { await requireOwner(); return null; }"],
      ["orders/layout.tsx", "export default async function Layout() { await requireOwner(); return null; }"],
      ["orders/directive.ts", '"use server"; export async function update() { "use strict"; await requireOwner(); }'],
    ]);
    expect(findUnguardedOwnerHandlers(fixtures)).toEqual([]);
  });

  it.each([
    ["a guard in unreachable code", '"use server"; export async function ok() { if (false) await requireOwner(); }'],
    ["a guard after a private read", '"use server"; export async function ok() { const rows = await readPrivateOrders(); await requireOwner(); return rows; }'],
    ["an unawaited guard", '"use server"; export async function ok() { requireOwner(); }'],
    ["a nested guard", '"use server"; export async function ok() { { await requireOwner(); } }'],
  ])("rejects %s", (_label, code) => {
    expect(findUnguardedOwnerHandlers(new Map([["orders/actions.ts", code]]))).toEqual(["orders/actions.ts:ok"]);
  });

  it("requires every protected exported action, route handler, page and layout to call requireOwner", () => {
    expect(findUnguardedOwnerHandlers(readOwnerSources(ownerRoot))).toEqual([]);
  });
});
