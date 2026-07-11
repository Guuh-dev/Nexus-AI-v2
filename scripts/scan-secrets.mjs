import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const excluded = new Set([".git", ".expo", "node_modules", "coverage", "android", "ios"]);
const binaryExtensions = /\.(png|jpg|jpeg|gif|webp|ico|zip|apk|aab|woff2?)$/i;
const findings = [];
const secretPattern = new RegExp(["sk", "or", "v1"].join("-") + "-[A-Za-z0-9_-]{20,}", "g");

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
    const source = readFileSync(path, "utf8");
    if (secretPattern.test(source)) findings.push(relative(root, path));
    secretPattern.lastIndex = 0;
    if (/EXPO_PUBLIC_(?:OPENROUTER|API_KEY|SECRET)/i.test(source)) findings.push(`${relative(root, path)} (segredo público)`);
  }
}

walk(root);
if (findings.length) {
  console.error("Possível segredo encontrado:", [...new Set(findings)].join(", "));
  process.exit(1);
}
console.log("Nenhum padrão de chave OpenRouter foi encontrado no projeto ou bundle.");
