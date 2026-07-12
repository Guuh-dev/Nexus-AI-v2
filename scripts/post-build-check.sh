#!/usr/bin/env bash
set -euo pipefail

pnpm run typecheck
pnpm run lint
pnpm test
pnpm run security:secrets
pnpm run release:check
pnpm exec expo install --check
pnpm audit --audit-level=high
pnpm run export:web
pnpm exec expo prebuild --platform android --no-install --clean

bash scripts/verify-native-widget.sh

echo "Nexus verification completed. The Android source is ready for EAS Build."
