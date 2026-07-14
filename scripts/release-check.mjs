import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RELEASE_VERSION = "3.0.0";
const requiredFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "app.json",
  "eas.json",
  "app/_layout.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/brain.tsx",
  "app/(tabs)/today.tsx",
  "app/(tabs)/progress.tsx",
  "app/api/assistant+api.ts",
  "app/api/status+api.ts",
  "constants/defaults.ts",
  "constants/models.ts",
  "constants/release.ts",
  "features/widget/render-spec.ts",
  "features/learning/roadmap.ts",
  "features/progress/weekly-review.ts",
  "schemas/storage.schema.ts",
  "services/assistant.server.ts",
  "services/openrouter.server.ts",
  "services/storage.service.ts",
  "services/widget.service.ts",
  "theme/theme.ts",
  "modules/nexus-widget/package.json",
  "modules/nexus-widget/expo-module.config.json",
  "modules/nexus-widget/android/build.gradle",
  "modules/nexus-widget/android/src/main/AndroidManifest.xml",
  "modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetProvider.kt",
  "modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt",
  "scripts/detect-native-changes.mjs",
  "scripts/verify-native-widget.sh",
  ".github/workflows/ci.yml",
  ".github/workflows/security.yml",
  ".github/workflows/native-change-detector.yml",
  ".github/workflows/android-build.yml",
  ".github/workflows/release.yml",
  ".github/workflows/ota-preview.yml",
  ".github/workflows/ota-production.yml",
  ".github/workflows/ota-rollback.yml",
  "README.md",
  "CHANGELOG.md",
  "AGENTS.md",
  "docs/ARCHITECTURE.md",
  "docs/AI_SYSTEM.md",
  "docs/WIDGETS.md",
  "docs/ANDROID_WIDGET.md",
  "docs/UPDATES.md",
  "docs/RELEASE_3_0.md",
  "docs/ANDROID_QA.md",
  "render.yaml",
  ".replit",
];

function fail(message) {
  console.error(`Release check failed. ${message}`);
  process.exit(1);
}

function read(file) {
  return readFileSync(file, "utf8");
}

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) fail(`Missing files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
if (existsSync("package-lock.json")) fail("package-lock.json must not coexist with pnpm-lock.yaml.");

const packageJson = JSON.parse(read("package.json"));
const appConfig = JSON.parse(read("app.json"));
const widgetPackage = JSON.parse(read("modules/nexus-widget/package.json"));
const expo = appConfig.expo ?? {};

if (packageJson.version !== RELEASE_VERSION) fail(`package.json must be ${RELEASE_VERSION}.`);
if (expo.version !== RELEASE_VERSION) fail(`app.json must be ${RELEASE_VERSION}.`);
if (widgetPackage.version !== RELEASE_VERSION) fail(`Native widget package must be ${RELEASE_VERSION}.`);
if (!String(packageJson.packageManager).startsWith("pnpm@10.")) fail("packageManager must pin pnpm 10.");
if (!/^\d+\.\d+\.\d+$/.test(String(packageJson.devDependencies?.["expo-doctor"] ?? ""))) {
  fail("expo-doctor must be installed at an exact version so the frozen CI can run the doctor script.");
}
if (!String(packageJson.engines?.node).includes(">=22.13") || !String(packageJson.engines?.node).includes("<23")) {
  fail("Node engine must stay on the supported Node 22 line.");
}
const requiredScripts = [
  "typecheck",
  "lint",
  "test",
  "verify",
  "doctor",
  "security:secrets",
  "release:check",
  "export:web",
  "native:check",
];
for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) fail(`Missing pnpm script: ${script}`);
}
if (packageJson.pnpm?.overrides?.uuid !== "11.1.1") fail("uuid must stay on the patched override.");

const releaseSource = read("constants/release.ts");
for (const marker of [`label: "${RELEASE_VERSION}"`, `runtime: "${RELEASE_VERSION}"`, 'codename: "Core Reborn"']) {
  if (!releaseSource.includes(marker)) fail(`Release metadata is missing ${marker}.`);
}
const widgetGradle = read("modules/nexus-widget/android/build.gradle");
if (!widgetGradle.includes(`version = '${RELEASE_VERSION}'`) || !widgetGradle.includes(`versionName "${RELEASE_VERSION}"`)) {
  fail("The Android widget Gradle version must match the app.");
}

if (expo.android?.package !== "com.gustavoaraujo.nexusai") fail("Unexpected Android package.");
if (expo.runtimeVersion?.policy !== "appVersion") fail("runtimeVersion.policy must be appVersion.");
if (expo.updates?.url !== "https://u.expo.dev/3d477828-f7f9-407d-ab4c-868df567dff0") fail("EAS Update URL is missing.");
if (expo.updates?.enabled !== true || expo.updates?.checkAutomatically !== "ON_LOAD") fail("EAS Update checks must remain enabled.");
if (expo.updates?.disableAntiBrickingMeasures === true) fail("Expo anti-bricking measures may not be disabled.");
if (expo.backgroundColor !== "#050505") fail("The native root background must remain dark.");
const blocked = new Set(expo.android?.blockedPermissions ?? []);
for (const permission of [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
]) {
  if (!blocked.has(permission)) fail(`Sensitive Android permission is not blocked: ${permission}`);
}

const eas = JSON.parse(read("eas.json"));
for (const profile of ["development", "preview", "production", "release"]) {
  const apiUrl = eas.build?.[profile]?.env?.EXPO_PUBLIC_API_URL;
  if (typeof apiUrl !== "string" || !apiUrl.startsWith("https://")) fail(`${profile} needs a secure API URL.`);
}
if (eas.build?.preview?.channel !== "preview") fail("Preview must use its own OTA channel.");
if (eas.build?.production?.channel !== "production" || eas.build?.release?.channel !== "production") fail("Production builds must use the production channel.");
if (eas.build?.release?.android?.buildType !== "apk") fail("Release profile must produce an APK.");

const tabs = [...read("app/(tabs)/_layout.tsx").matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map((match) => match[1]);
if (JSON.stringify(tabs) !== JSON.stringify(["today", "brain", "focus", "progress", "profile"])) {
  fail(`The core tab contract changed: ${tabs.join(", ")}`);
}
const rootLayout = read("app/_layout.tsx");
if (!rootLayout.includes('data.preferences.theme === "light"')) fail("System bars must react to the Light theme.");

const themeSource = read("theme/theme.ts");
for (const theme of ["nexus", "amoled", "glass", "light", "pixel", "minimal"]) {
  if (!themeSource.includes(`${theme}: {`)) fail(`Core theme missing: ${theme}`);
}
for (const token of ["onPrimary", "onSuccess", "surfaceRaised", "borderStrong", "tabBar", "shadow", "glow"]) {
  if (!themeSource.includes(`${token}:`)) fail(`Theme token missing: ${token}`);
}

const defaults = read("constants/defaults.ts");
const storage = read("services/storage.service.ts");
const storageSchema = read("schemas/storage.schema.ts");
if (!defaults.includes("export const STORAGE_VERSION = 6")) fail("Storage v6 is required.");
if (!defaults.includes('@nexus-ai/pre-v3.0-backup')) fail("The pre-v3 migration backup key is missing.");
for (const marker of ["recoverArray", "writeLockReason", "hasPreMigrationBackup", "migrateWidgetPreferences", "LEGACY_MIGRATION_BACKUP_KEYS"]) {
  if (!storage.includes(marker)) fail(`Storage migration capability missing: ${marker}`);
}
for (const theme of ["glass", "pixel", "minimal"]) {
  if (!storageSchema.includes(`"${theme}"`)) fail(`Storage schema does not accept v3 theme ${theme}.`);
}

const models = read("constants/models.ts");
const assistant = read("services/assistant.server.ts");
const planner = read("services/openrouter.server.ts");
for (const marker of ["ASSISTANT_MODEL_REGISTRY", "MODE_CAPABILITIES", "defaultModelsForMode", "assertModelSupportsMode", "uncontrolled_router"]) {
  if (!models.includes(marker)) fail(`Capability-aware model routing missing: ${marker}`);
}
for (const service of [["assistant", assistant], ["planner", planner]]) {
  if (service[1].includes('"openrouter/free"') || service[1].includes("FREE_ROUTER")) fail(`${service[0]} still uses the uncontrolled free router.`);
  if (!service[1].includes("assertModelSupportsMode")) fail(`${service[0]} does not validate resolved model capabilities.`);
}
const statusRoute = read("app/api/status+api.ts");
if (!statusRoute.includes(`apiVersion: "${RELEASE_VERSION}"`) || !statusRoute.includes("assistantAvailable")) {
  fail("The v3 status contract is incomplete.");
}

const renderSpec = read("features/widget/render-spec.ts");
for (const marker of [
  'WIDGET_RENDER_SPEC_VERSION = 3',
  '"mini"',
  '"strip"',
  '"companion"',
  '"mission"',
  '"command"',
  'taskLimit: 0 | 2 | 4',
  'privateMode: boolean',
  'normalizeWidgetSpeech',
  'normalizeWidgetTapAction',
]) {
  if (!renderSpec.includes(marker)) fail(`WidgetRenderSpec capability missing: ${marker}`);
}
const nativeProvider = read("modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetProvider.kt");
for (const marker of ["MINI(", "STRIP(", "COMPANION(", "MISSION(", "COMMAND(", "validNonce", 'optJSONObject("renderSpecs")', "opacityPercent", "privateMode", "normalizeTapAction", "familyForProviderClass"]) {
  if (!nativeProvider.includes(marker)) fail(`Native widget capability missing: ${marker}`);
}
for (const layout of ["mini", "strip", "companion", "mission", "command"]) {
  const file = layout === "command" ? "nexus_widget.xml" : `nexus_widget_${layout}.xml`;
  if (!existsSync(`modules/nexus-widget/android/src/main/res/layout/${file}`)) fail(`Widget layout missing: ${file}`);
}

const envExample = read(".env.example");
if (!/^OPENROUTER_API_KEY=\s*$/m.test(envExample) || /OPENROUTER_API_KEY=\S+/m.test(envExample)) {
  fail(".env.example must contain only an empty server-side provider key.");
}
if (/EXPO_PUBLIC_(?:OPENROUTER|API_KEY|SECRET)/i.test(envExample)) fail("A client-public variable may not contain an AI secret.");

const workflowDir = ".github/workflows";
const workflowFiles = readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file));
const workflowText = workflowFiles.map((file) => read(join(workflowDir, file))).join("\n");
const productionOtaWorkflow = read(join(workflowDir, "ota-production.yml"));
if (/\bnpm ci\b/.test(workflowText)) fail("Workflows must use pnpm, not npm ci.");
for (const marker of [
  "node-version: 22.14.0",
  "pnpm install --frozen-lockfile",
  "pnpm run doctor",
  "expo prebuild --platform android --clean",
  ":app:assembleDebug",
  "pnpm audit --audit-level=high",
  'BASE_TAG="v${VERSION}"',
  "eas-cli@20.5.1 update",
  "eas-cli@20.5.1 build",
  'SOURCE_REF: ${{ github.ref }}',
  'detect-native-changes.mjs "$BASE_REF" HEAD tree',
  'merge-base --is-ancestor "$TAG_COMMIT" origin/main',
  "Gate on the published v3 backend",
  "Gate on the published v3 backend contract",
]) {
  if (!workflowText.includes(marker)) fail(`Workflow validation is missing: ${marker}`);
}
if (/-X\s+POST/.test(productionOtaWorkflow) || productionOtaWorkflow.includes("PROBE_CLIENT_ID")) {
  fail("Production OTA must validate the backend through the non-mutating GET contract only.");
}

const render = read("render.yaml");
if (!render.includes("healthCheckPath: /api/status")) fail("Render health check must target /api/status.");
if (!render.includes("22.14.0") || !render.includes("--frozen-lockfile")) fail("Render must use Node 22 and frozen pnpm install.");
for (const deploymentFile of ["render.yaml", ".replit"]) {
  if (/\bnpm (?:ci|install|run)\b/.test(read(deploymentFile))) fail(`${deploymentFile} must use pnpm.`);
}

const agents = read("AGENTS.md");
if (!agents.includes("v3.0.0") || !agents.includes("Core Reborn")) fail("AGENTS.md does not describe the v3 architecture.");

console.log(`Release check passed: Nexus AI v${RELEASE_VERSION} Core Reborn is ready for full validation.`);
