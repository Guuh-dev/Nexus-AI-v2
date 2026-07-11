import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe("web style regression", () => {
  it("never forwards React Native style arrays to raw DOM elements", () => {
    const files = ["app", "components", "features", "providers", "services"].flatMap(sourceFiles);
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/<(div|span|button|section|main|input)[^>]*style=\{\s*\[/i);
    expect(source).not.toMatch(/style=\{\{\s*\.\.\.[A-Za-z_$][\w$]*Array/i);
    expect(source).not.toMatch(/(?:boxShadow|background|opacity)\s*:\s*\[/);
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
