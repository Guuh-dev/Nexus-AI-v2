import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "package.json",
  "app.json",
  "eas.json",
  "app/_layout.tsx",
  "app/professor-intake.tsx",
  "app/api/generate-plan+api.ts",
  "app/api/assistant+api.ts",
  "services/openrouter.server.ts",
  "services/assistant.server.ts",
  "schemas/expansion.schema.ts",
  "modules/nexus-widget/expo-module.config.json",
  "modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt",
  "features/widget/presets.ts",
  "services/api-config.ts",
  "utils/untrusted-data.ts",
  ".github/workflows/security.yml",
  "render.yaml",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Release check failed. Missing files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const requiredScripts = ["typecheck", "lint", "test", "security:secrets", "export:web"];
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);
if (missingScripts.length > 0) {
  console.error(`Release check failed. Missing npm scripts: ${missingScripts.join(", ")}`);
  process.exit(1);
}

const appConfig = JSON.parse(readFileSync("app.json", "utf8"));
const identifier = appConfig.expo?.android?.package;
if (identifier !== "com.gustavoaraujo.nexusai") {
  console.error(`Release check failed. Unexpected Android package: ${identifier ?? "missing"}`);
  process.exit(1);
}

if (appConfig.expo?.extra?.eas?.projectId !== "3d477828-f7f9-407d-ab4c-868df567dff0" || appConfig.expo?.owner !== "littleguhh") {
  console.error("Release check failed. Expo owner or EAS project linkage is missing.");
  process.exit(1);
}

if (packageJson.version !== appConfig.expo?.version) {
  console.error(`Release check failed. package.json (${packageJson.version}) and app.json (${appConfig.expo?.version ?? "missing"}) versions differ.`);
  process.exit(1);
}

const easConfig = JSON.parse(readFileSync("eas.json", "utf8"));
if (easConfig.build?.preview?.autoIncrement !== true || easConfig.build?.production?.autoIncrement !== true) {
  console.error("Release check failed. Android preview and production builds must auto-increment their remote version code.");
  process.exit(1);
}
for (const profile of ["development", "preview", "production"]) {
  const apiUrl = easConfig.build?.[profile]?.env?.EXPO_PUBLIC_API_URL;
  if (typeof apiUrl !== "string" || !apiUrl.startsWith("https://")) {
    console.error(`Release check failed. ${profile} does not have a secure public API URL.`);
    process.exit(1);
  }
}

const envExample = readFileSync(".env.example", "utf8");
if (!/^OPENROUTER_API_KEY=\s*$/m.test(envExample) || /OPENROUTER_API_KEY=\S+/m.test(envExample)) {
  console.error("Release check failed. .env.example must document an empty server-side OpenRouter key.");
  process.exit(1);
}
if (/EXPO_PUBLIC_(?:OPENROUTER|API_KEY|SECRET)/i.test(envExample)) {
  console.error("Release check failed. No client-public variable may contain an AI secret.");
  process.exit(1);
}

console.log("Release check passed: Nexus AI v2.1 structure, scripts, security and Android identity are ready.");
