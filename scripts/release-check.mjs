import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const requiredFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "app.json",
  "eas.json",
  "app/_layout.tsx",
  "app/loading-plan.tsx",
  "app/professor-intake.tsx",
  "app/api/generate-plan+api.ts",
  "app/api/assistant+api.ts",
  "components/LoadingPlan.tsx",
  "components/ui/Screen.tsx",
  "providers/NexusProvider.tsx",
  "services/openrouter.server.ts",
  "services/assistant.server.ts",
  "services/update.service.ts",
  "schemas/expansion.schema.ts",
  "modules/nexus-widget/expo-module.config.json",
  "modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt",
  "features/widget/presets.ts",
  "services/api-config.ts",
  "utils/untrusted-data.ts",
  "scripts/detect-native-changes.mjs",
  ".github/workflows/ci.yml",
  ".github/workflows/security.yml",
  ".github/workflows/ota-preview.yml",
  ".github/workflows/ota-production.yml",
  ".github/workflows/android-build.yml",
  ".github/workflows/release.yml",
  ".github/workflows/native-change-detector.yml",
  ".github/workflows/ota-rollback.yml",
  "scripts/verify-native-widget.sh",
  "render.yaml",
  ".replit",
];

function fail(message) {
  console.error(`Release check failed. ${message}`);
  process.exit(1);
}

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) fail(`Missing files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
if (existsSync("package-lock.json")) fail("package-lock.json must not coexist with pnpm-lock.yaml.");

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const requiredScripts = ["typecheck", "lint", "test", "security:secrets", "export:web", "native:check"];
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);
if (missingScripts.length > 0) fail(`Missing pnpm scripts: ${missingScripts.join(", ")}`);
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) fail(`Invalid semantic version: ${packageJson.version}`);
if (!String(packageJson.packageManager).startsWith("pnpm@10.")) fail("packageManager must pin pnpm 10.");
if (!String(packageJson.engines?.node).includes(">=22.13")) fail("Node engine must require 22.13 or newer.");
if (packageJson.dependencies?.["expo-updates"] !== "~57.0.6") fail("expo-updates must match Expo SDK 57.");
if (packageJson.dependencies?.["expo-navigation-bar"] !== "~57.0.1") fail("expo-navigation-bar must match Expo SDK 57.");
if (packageJson.pnpm?.overrides?.uuid !== "11.1.1") fail("pnpm must override uuid to the patched 11.1.1 release.");

const appConfig = JSON.parse(readFileSync("app.json", "utf8"));
const expo = appConfig.expo ?? {};
if (expo.android?.package !== "com.gustavoaraujo.nexusai") fail(`Unexpected Android package: ${expo.android?.package ?? "missing"}`);
if (expo.extra?.eas?.projectId !== "3d477828-f7f9-407d-ab4c-868df567dff0" || expo.owner !== "littleguhh") {
  fail("Expo owner or EAS project linkage is missing.");
}
if (packageJson.version !== expo.version) fail(`package.json (${packageJson.version}) and app.json (${expo.version ?? "missing"}) versions differ.`);
if (expo.runtimeVersion?.policy !== "appVersion") fail("runtimeVersion.policy must be appVersion.");
if (expo.updates?.url !== "https://u.expo.dev/3d477828-f7f9-407d-ab4c-868df567dff0") fail("EAS Update URL is missing or incorrect.");
if (expo.updates?.enabled !== true || expo.updates?.checkAutomatically !== "ON_LOAD") fail("EAS Update must be enabled with ON_LOAD checks.");
if (expo.updates?.disableAntiBrickingMeasures === true) fail("Expo anti-bricking measures may not be disabled.");
if (expo.backgroundColor !== "#050505") fail("Root background must stay dark to prevent white flashes.");
const rootLayout = readFileSync("app/_layout.tsx", "utf8");
if (!rootLayout.includes('<StatusBar style="light" />') || !rootLayout.includes('NavigationBar.setStyle("dark")') || !rootLayout.includes('NavigationBar.setHidden(false)')) {
  fail("Runtime system bars must stay dark with light status content.");
}

const navigationPlugin = expo.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-navigation-bar");
if (!navigationPlugin || navigationPlugin[1]?.hidden !== false || navigationPlugin[1]?.style !== "dark") {
  fail("expo-navigation-bar must keep a visible dark Android navigation bar.");
}

const easConfig = JSON.parse(readFileSync("eas.json", "utf8"));
for (const profile of ["development", "preview", "production", "release"]) {
  const apiUrl = easConfig.build?.[profile]?.env?.EXPO_PUBLIC_API_URL;
  if (typeof apiUrl !== "string" || !apiUrl.startsWith("https://")) fail(`${profile} does not have a secure public API URL.`);
}
if (easConfig.build?.preview?.channel !== "preview") fail("Preview build must use the preview channel.");
if (easConfig.build?.production?.channel !== "production" || easConfig.build?.release?.channel !== "production") {
  fail("Production and release builds must use the production channel.");
}
if (easConfig.build?.release?.android?.buildType !== "apk") fail("Release profile must produce an APK.");
if (easConfig.build?.preview?.autoIncrement !== true || easConfig.build?.production?.autoIncrement !== true || easConfig.build?.release?.autoIncrement !== true) {
  fail("Preview, production and release builds must auto-increment their remote version code.");
}

const envExample = readFileSync(".env.example", "utf8");
if (!/^OPENROUTER_API_KEY=\s*$/m.test(envExample) || /OPENROUTER_API_KEY=\S+/m.test(envExample)) {
  fail(".env.example must document an empty server-side OpenRouter key.");
}
if (/EXPO_PUBLIC_(?:OPENROUTER|API_KEY|SECRET)/i.test(envExample)) fail("No client-public variable may contain an AI secret.");

const workflowDir = ".github/workflows";
const workflowText = readdirSync(workflowDir)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => readFileSync(join(workflowDir, file), "utf8"))
  .join("\n");
if (/\bnpm ci\b/.test(workflowText)) fail("GitHub workflows must use pnpm, not npm ci.");
if (!workflowText.includes('BASE_TAG="v${VERSION}"')) fail("OTA workflows must compare against the installed version tag.");
for (const deploymentFile of ["render.yaml", ".replit"]) {
  const deploymentText = readFileSync(deploymentFile, "utf8");
  if (/\bnpm (?:ci|install|run)\b/.test(deploymentText)) fail(`${deploymentFile} must use pnpm only.`);
}
if (!workflowText.includes("eas-cli@20.5.1 update") || !workflowText.includes("eas-cli@20.5.1 build")) {
  fail("OTA and Android build automation are incomplete or EAS CLI is not pinned.");
}

const provider = readFileSync("providers/NexusProvider.tsx", "utf8");
const loadingRoute = readFileSync("app/loading-plan.tsx", "utf8");
if (!provider.includes("50_000") || !provider.includes("recoverPlanLocally")) fail("Plan generation watchdog and recovery are missing.");
if (/useEffect\(\(\) => \(\) =>[\s\S]{0,200}cancelPlanGeneration/.test(loadingRoute)) {
  fail("Loading route must not abort plan generation from an effect cleanup.");
}

console.log(`Release check passed: Nexus AI v${packageJson.version} is ready for CI, OTA and Android release.`);
