import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowDirectory = path.join(process.cwd(), ".github", "workflows");
const workflowFiles = fs
  .readdirSync(workflowDirectory)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(workflowDirectory, name), "utf8");
}

describe("GitHub workflow security", () => {
  it("uses pnpm consistently and never falls back to npm ci", () => {
    for (const file of workflowFiles) {
      const workflow = readWorkflow(file);
      expect(workflow, file).not.toMatch(/\bnpm ci\b/);
      expect(workflow, file).not.toMatch(/pnpm\/action-setup@v4\s*\n\s*with:\s*\n\s*version:/);
    }
  });

  it("does not interpolate workflow_dispatch text directly into shell commands", () => {
    for (const file of workflowFiles) {
      const workflow = readWorkflow(file);
      expect(workflow, file).not.toMatch(/--message\s+["']?\$\{\{\s*inputs\./);
      expect(workflow, file).not.toMatch(/update:rollback\s+["']?\$\{\{\s*inputs\./);
      expect(workflow, file).not.toMatch(/--profile\s+["']?\$\{\{\s*inputs\./);
    }
  });

  it("compares OTA bundles against the installed version tag", () => {
    const preview = readWorkflow("ota-preview.yml");
    const production = readWorkflow("ota-production.yml");

    expect(preview).toContain('BASE_TAG="v${VERSION}"');
    expect(preview).toContain('refs/tags/${BASE_TAG}');
    expect(preview).toContain("grep -Eq '\\.apk$'");
    expect(production).toContain('BASE_TAG="v${VERSION}"');
    expect(production).toContain('Missing base tag ${BASE_TAG}');
    expect(production).toContain('has no APK asset');
  });

  it("keeps destructive publishing actions behind explicit confirmations", () => {
    const production = readWorkflow("ota-production.yml");
    const rollback = readWorkflow("ota-rollback.yml");

    expect(production).toContain('if [ "$CONFIRM" != "PRODUCTION" ]');
    expect(production).toContain('RELEASE_MESSAGE: ${{ inputs.message }}');
    expect(rollback).toContain('if [ "$CONFIRM" != "ROLLBACK" ]');
    expect(rollback).toContain('UPDATE_GROUP_ID: ${{ inputs.group_id }}');
  });

  it("grants write access only to the tagged release workflow", () => {
    for (const file of workflowFiles) {
      const workflow = readWorkflow(file);
      if (file === "release.yml") {
        expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*write/);
      } else {
        expect(workflow, file).not.toMatch(/contents:\s*write/);
      }
    }
  });
});
