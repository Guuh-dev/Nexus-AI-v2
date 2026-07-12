const NATIVE_EXACT = new Set([
  "app.json",
  "app.config.js",
  "app.config.ts",
  "eas.json",
  "expo-build-properties.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

const NATIVE_PREFIXES = [
  "android/",
  "ios/",
  "modules/",
  "plugins/",
  "assets/icon",
  "assets/adaptive-icon",
  "assets/splash",
  "assets/notification-icon",
];

const NON_RUNTIME_PREFIXES = [
  ".github/",
  "docs/",
  "tests/",
  ".vscode/",
];

const NON_RUNTIME_EXACT = new Set([
  ".gitignore",
  ".replit",
  "AGENTS.md",
  "CHANGELOG.md",
  "LICENSE",
  "PRIVACY.md",
  "README.md",
  "SECURITY.md",
  "render.yaml",
]);

function stable(value) {
  return JSON.stringify(value ?? null);
}

function packageNativeChanged(basePackage, headPackage) {
  if (!basePackage || !headPackage) return true;
  return [
    "version",
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "overrides",
    "resolutions",
    "expo",
    "packageManager",
    "pnpm",
    "engines",
  ].some((key) => stable(basePackage[key]) !== stable(headPackage[key]));
}

export function classifyNativeChanges({ files, basePackage, headPackage }) {
  const normalized = [...new Set(files.map((file) => file.trim().replaceAll("\\", "/")).filter(Boolean))];
  const nativeReasons = [];
  let otaChanged = false;

  for (const file of normalized) {
    if (NATIVE_EXACT.has(file) || NATIVE_PREFIXES.some((prefix) => file.startsWith(prefix))) {
      nativeReasons.push(file);
      continue;
    }

    if (file === "package.json") {
      if (packageNativeChanged(basePackage, headPackage)) nativeReasons.push("package.json (runtime/native dependency or version changed)");
      else otaChanged = true;
      continue;
    }

    if (NON_RUNTIME_EXACT.has(file) || NON_RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix))) continue;

    if (/\.(tsx?|jsx?|json|css|svg|png|jpe?g|webp|gif|woff2?|ttf|otf)$/i.test(file)) otaChanged = true;
  }

  return {
    nativeChanged: nativeReasons.length > 0,
    otaChanged,
    nativeReasons,
    files: normalized,
  };
}
