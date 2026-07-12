import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = process.cwd();
const excluded = new Set([".git", ".expo", "node_modules", "coverage", "dist", "android", "ios", ".config", ".local", ".cache"]);
const binaryExtensions = /\.(png|jpg|jpeg|gif|webp|ico|zip|apk|aab|woff2?|ttf|otf|keystore|jks)$/i;
const findings = [];
const secretPatterns = [
  ["OpenRouter key", /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/g],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/g],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const sensitiveAssignment = /^(?:OPENROUTER_API_KEY|EXPO_TOKEN|GITHUB_TOKEN|GH_TOKEN)\s*=\s*([^#\s][^\r\n]*)/gm;

function scanFile(path) {
  const source = readFileSync(path, "utf8");
  const display = relative(root, path);

  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) findings.push(`${display} (${label})`);
  }

  if (/EXPO_PUBLIC_(?:OPENROUTER|API_KEY|SECRET|TOKEN)/i.test(source)) {
    findings.push(`${display} (server secret exposed through EXPO_PUBLIC_*)`);
  }

  const name = basename(path);
  if (name === ".env" || /^\.env\.(?:local|production|preview|development)$/.test(name)) {
    sensitiveAssignment.lastIndex = 0;
    if (sensitiveAssignment.test(source)) findings.push(`${display} (secret committed in environment file)`);
  }
}

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (excluded.has(name)) continue;
    const path = join(directory, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path);
      continue;
    }
    if (binaryExtensions.test(name) || name === "scan-secrets.mjs") continue;
    scanFile(path);
  }
}

walk(root);
if (findings.length) {
  console.error("Possible secret found:", [...new Set(findings)].join(", "));
  process.exit(1);
}
console.log("Secret scan passed: no OpenRouter, GitHub, private-key or public-secret patterns found.");
