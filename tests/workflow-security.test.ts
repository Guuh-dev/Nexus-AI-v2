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
  it("declares the Doctor executable at an exact version for frozen installs", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(packageJson.scripts?.doctor).toBe("expo-doctor");
    expect(packageJson.devDependencies?.["expo-doctor"]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("uses pnpm consistently and never falls back to npm ci", () => {
    for (const file of workflowFiles) {
      const workflow = readWorkflow(file);
      expect(workflow, file).not.toMatch(/\bnpm ci\b/);
      expect(workflow, file).not.toMatch(/pnpm\/action-setup@v4\s*\n\s*with:\s*\n\s*version:/);
    }
  });

  it("pins Node 22 and performs full JavaScript and Android validation", () => {
    const ci = readWorkflow("ci.yml");
    expect(ci).toContain("node-version: 22.14.0");
    expect(ci).toContain("pnpm install --frozen-lockfile");
    expect(ci).toContain("pnpm run verify");
    expect(ci).toContain("pnpm run release:check");
    expect(ci).toContain("pnpm run doctor");
    expect(ci).toContain("expo prebuild --platform android --clean");
    expect(ci).toContain("working-directory: android");
    expect(ci).toContain("./gradlew --no-daemon :app:assembleDebug");
    expect(ci).not.toContain("./android/gradlew --no-daemon :app:assembleDebug");
    expect(ci).toContain(":app:assembleDebug");
    expect(ci).toContain("git diff --check");
  });

  it("fails dependency audits at high severity", () => {
    expect(readWorkflow("security.yml")).toContain("pnpm audit --audit-level=high");
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
    expect(preview).toContain('detect-native-changes.mjs "$BASE_REF" "$HEAD_REF" tree');
    expect(production).toContain('detect-native-changes.mjs "$BASE_REF" HEAD tree');
    expect(production).toContain('if [ "$SOURCE_REF" != "refs/heads/main" ]');
    expect(production).toContain('git merge-base --is-ancestor "$BASE_TAG" HEAD');
  });

  it("only releases tagged commits from main after the v3 backend gate", () => {
    const release = readWorkflow("release.yml");
    expect(release).toContain("fetch-depth: 0");
    expect(release).toContain('git merge-base --is-ancestor "$TAG_COMMIT" origin/main');
    expect(release).toContain("Gate on the published v3 backend");
    expect(release).toContain('status.apiVersion !== process.env.EXPECTED_VERSION');
    expect(release).toContain('status.probe?.ok !== true');
  });

  it("blocks production OTA on the published v3 GET contract without a live POST probe", () => {
    const production = readWorkflow("ota-production.yml");
    expect(production).toContain("Gate on the published v3 backend contract");
    expect(production).toContain('"$API_URL/api/status"');
    expect(production).toContain('status.apiVersion !== process.env.EXPECTED_VERSION');
    expect(production).toContain('status.service !== "nexus-ai-v3"');
    expect(production).toContain('status.configured !== true || status.assistantAvailable !== true');
    expect(production).not.toMatch(/-X\s+POST/);
    expect(production).not.toContain("PROBE_CLIENT_ID");
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
