#!/usr/bin/env bash
set -euo pipefail

npm run typecheck
npm run lint
npm test
npm run security:secrets
npx expo install --check
npm audit --audit-level=high
npm run export:web
npx expo prebuild --platform android --no-install --clean

echo "Nexus verification completed. The Android source is ready for EAS Build."
