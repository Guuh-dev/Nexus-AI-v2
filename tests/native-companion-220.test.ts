import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const provider = readFileSync("modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetProvider.kt", "utf8");
const configure = readFileSync("modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt", "utf8");
const companionLayout = readFileSync("modules/nexus-widget/android/src/main/res/layout/nexus_widget_companion.xml", "utf8");

describe("native Companion widgets 3.0", () => {
  it("supports the seven personalities and per-instance speech without unrelated dashboards", () => {
    for (const value of ["happy", "playful", "motivational", "serious", "strict", "calm", "quiet", "contextual", "silent"]) {
      expect(configure).toContain(`"${value}"`);
    }
    expect(configure).not.toContain('"finance" to');
    expect(configure).not.toContain('"habits" to');
    expect(configure).not.toContain('"boss" to');
    expect(provider).toContain("companionLine");
    expect(companionLayout).toContain('android:maxLines="3"');
    expect(companionLayout).toContain('android:ellipsize="end"');
  });

  it("keeps legacy page and task broadcasts nonce-protected", () => {
    expect(provider).toContain("ACTION_NEXT_PAGE");
    expect(provider.match(/if \(!validNonce\(context, intent\)\) return/g)?.length).toBeGreaterThanOrEqual(2);
    expect(provider).toContain("PendingIntent.FLAG_IMMUTABLE");
  });
});
