import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ownerRoot = join(process.cwd(), "app/owner");
const publicHandlers = new Set(["login/actions.ts", "auth/callback/route.ts"]);

type SourceMap = Map<string, string>;

function exportedHandlers(source: ts.SourceFile): ts.FunctionDeclaration[] {
  return source.statements.filter((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement)
    && Boolean(statement.name)
    && Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
    && Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)),
  );
}

function findUnguardedOwnerHandlers(files: SourceMap): string[] {
  const violations: string[] = [];
  for (const [path, contents] of files) {
    const normalized = path.replaceAll("\\", "/");
    if (publicHandlers.has(normalized)) continue;
    const source = ts.createSourceFile(normalized, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const isActionModule = source.statements.some((statement) =>
      ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === "use server",
    );
    const handlers = exportedHandlers(source).filter((handler) => {
      const name = handler.name?.text ?? "";
      return isActionModule || ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(name);
    });
    for (const handler of handlers) {
      let guarded = false;
      const inspect = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "requireOwner") guarded = true;
        ts.forEachChild(node, inspect);
      };
      if (handler.body) inspect(handler.body);
      if (!guarded) violations.push(`${normalized}:${handler.name?.text}`);
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
  it("rejects an exported owner handler without requireOwner", () => {
    const fixture = new Map([["orders/actions.ts", '"use server"; export async function deleteOrders() { return true; }']]);
    expect(findUnguardedOwnerHandlers(fixture)).toEqual(["orders/actions.ts:deleteOrders"]);
  });

  it("requires every protected exported action and route handler to call requireOwner", () => {
    expect(findUnguardedOwnerHandlers(readOwnerSources(ownerRoot))).toEqual([]);
  });
});
