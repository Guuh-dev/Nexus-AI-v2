#!/usr/bin/env bash
set -euo pipefail

MANIFEST="android/app/src/main/AndroidManifest.xml"
MODULE="modules/nexus-widget/android/src/main"

for file in \
  "$MANIFEST" \
  "$MODULE/AndroidManifest.xml" \
  "$MODULE/res/xml/nexus_widget_info.xml" \
  "$MODULE/res/layout/nexus_widget.xml" \
  "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt" \
  "$MODULE/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt"; do
  test -f "$file" || { echo "Native widget check failed: missing $file" >&2; exit 1; }
done

grep -q 'expo.modules.nexuswidget.NexusWidgetProvider' "$MANIFEST"
grep -q 'expo.modules.nexuswidget.NexusWidgetConfigureActivity' "$MANIFEST"
grep -q 'android.appwidget.action.APPWIDGET_UPDATE' "$MANIFEST"
grep -q '@xml/nexus_widget_info' "$MANIFEST"
grep -q 'android:allowBackup="false"' "$MANIFEST"

echo "Native widget check passed: provider, configuration activity, metadata and backup policy are present."
