import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { classifyNativeChanges } from "./native-change-classifier.mjs";

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readPackageAt(ref) {
  try {
    return JSON.parse(runGit(["show", `${ref}:package.json`]));
  } catch {
    return null;
  }
}

function writeOutput(key, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  fs.appendFileSync(output, `${key}=${String(value)}\n`);
}

const [baseRef = "HEAD^", headRef = "HEAD"] = process.argv.slice(2);
let files;
let basePackage = null;
let headPackage = null;

try {
  if (process.env.NEXUS_CHANGED_FILES) {
    files = process.env.NEXUS_CHANGED_FILES.split(/\r?\n/);
  } else {
    files = runGit(["diff", "--name-only", `${baseRef}...${headRef}`]).split(/\r?\n/);
    basePackage = readPackageAt(baseRef);
    headPackage = readPackageAt(headRef);
  }

  const result = classifyNativeChanges({ files, basePackage, headPackage });
  writeOutput("native_changed", result.nativeChanged);
  writeOutput("ota_changed", result.otaChanged);
  writeOutput("native_reasons", JSON.stringify(result.nativeReasons));
  writeOutput("changed_files", JSON.stringify(result.files));

  console.log(JSON.stringify({ baseRef, headRef, ...result }, null, 2));
} catch (error) {
  // A detector must fail closed. If Git history is incomplete, require a new APK
  // rather than accidentally publishing an incompatible OTA update.
  writeOutput("native_changed", true);
  writeOutput("ota_changed", false);
  writeOutput("native_reasons", JSON.stringify(["detector_error"]));
  console.error("Native change detection failed; treating the change as native.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 0;
}
