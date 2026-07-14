#!/usr/bin/env bash
set -euo pipefail

MANIFEST="android/app/src/main/AndroidManifest.xml"
MODULE="modules/nexus-widget/android/src/main"

for file in \
  "$MANIFEST" \
  "$MODULE/AndroidManifest.xml" \
  "$MODULE/res/xml/nexus_widget_info.xml" \
  "$MODULE/res/xml/nexus_widget_mini_info.xml" \
  "$MODULE/res/xml/nexus_widget_strip_info.xml" \
  "$MODULE/res/xml/nexus_widget_companion_info.xml" \
  "$MODULE/res/xml/nexus_widget_mission_info.xml" \
  "$MODULE/res/layout/nexus_widget.xml" \
  "$MODULE/res/layout/nexus_widget_mini.xml" \
  "$MODULE/res/layout/nexus_widget_strip.xml" \
  "$MODULE/res/layout/nexus_widget_companion.xml" \
  "$MODULE/res/layout/nexus_widget_mission.xml" \
  "$MODULE/res/drawable/nexus_widget_background_transparent.xml" \
  "$MODULE/res/drawable/ic_nexus_orbit.xml" \
  "$MODULE/res/drawable/ic_nexus_ember.xml" \
  "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt" \
  "$MODULE/java/expo/modules/nexuswidget/NexusWidgetModule.kt" \
  "$MODULE/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt"; do
  test -f "$file" || { echo "Native widget check failed: missing $file" >&2; exit 1; }
done

grep -q 'expo.modules.nexuswidget.NexusWidgetProvider' "$MANIFEST"
grep -q 'expo.modules.nexuswidget.NexusWidgetConfigureActivity' "$MANIFEST"
grep -q 'android.appwidget.action.APPWIDGET_UPDATE' "$MANIFEST"
grep -q '@xml/nexus_widget_info' "$MANIFEST"
grep -q '@xml/nexus_widget_mini_info' "$MANIFEST"
grep -q '@xml/nexus_widget_strip_info' "$MANIFEST"
grep -q '@xml/nexus_widget_companion_info' "$MANIFEST"
grep -q '@xml/nexus_widget_mission_info' "$MANIFEST"
grep -q 'android:allowBackup="false"' "$MANIFEST"
grep -q 'nexus_widget_page' "$MODULE/res/layout/nexus_widget.xml"
grep -q 'ACTION_NEXT_PAGE' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'validNonce' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'normalizeTapAction' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'normalizeSpeech' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'privateMode' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'familyForProviderClass' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt"
grep -q 'privateMode' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetModule.kt"
grep -q 'class NexusMiniWidgetProvider' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'class NexusStripWidgetProvider' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'class NexusCompanionWidgetProvider' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'class NexusMissionWidgetProvider' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"
grep -q 'updatePeriodMillis="0"' "$MODULE/res/xml/nexus_widget_companion_info.xml"

if grep -Eq 'nexusai://(finance|habits|week)|nexusai://today\?capture=1' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"; then
  echo "Native widget check failed: legacy deep links remain reachable." >&2
  exit 1
fi

for orphan in gamer light neon translucent; do
  if test -e "$MODULE/res/drawable/nexus_widget_background_${orphan}.xml"; then
    echo "Native widget check failed: orphan background remains: $orphan" >&2
    exit 1
  fi
done

for metadata in "$MODULE"/res/xml/nexus_widget*_info.xml; do
  grep -q 'android:previewLayout=' "$metadata"
done

check_bounds() {
  local metadata="$1"
  local layout="$2"
  local width="$3"
  local height="$4"
  grep -q "android:minWidth=\"${width}dp\"" "$metadata"
  grep -q "android:minHeight=\"${height}dp\"" "$metadata"
  grep -q "android:minResizeWidth=\"${width}dp\"" "$metadata"
  grep -q "android:minResizeHeight=\"${height}dp\"" "$metadata"
  grep -q "android:minWidth=\"${width}dp\"" "$layout"
  grep -q "android:minHeight=\"${height}dp\"" "$layout"
}

check_bounds "$MODULE/res/xml/nexus_widget_mini_info.xml" "$MODULE/res/layout/nexus_widget_mini.xml" 40 40
check_bounds "$MODULE/res/xml/nexus_widget_strip_info.xml" "$MODULE/res/layout/nexus_widget_strip.xml" 110 40
check_bounds "$MODULE/res/xml/nexus_widget_companion_info.xml" "$MODULE/res/layout/nexus_widget_companion.xml" 110 110
check_bounds "$MODULE/res/xml/nexus_widget_mission_info.xml" "$MODULE/res/layout/nexus_widget_mission.xml" 250 110
check_bounds "$MODULE/res/xml/nexus_widget_info.xml" "$MODULE/res/layout/nexus_widget.xml" 250 250

if grep -Eq 'nexus_widget_(professor|learning)' "$MODULE"/res/layout/nexus_widget*.xml \
  || grep -Eq 'R\.id\.nexus_widget_(professor|learning)' "$MODULE/java/expo/modules/nexuswidget/NexusWidgetProvider.kt"; then
  echo "Native widget check failed: removed learning channel is still referenced." >&2
  exit 1
fi

echo "Native widget check passed: providers, safe configuration, render contract, previews and backup policy are present."
