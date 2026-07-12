import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const provider = readFileSync("modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetProvider.kt", "utf8");
const configure = readFileSync("modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt", "utf8");
const layout = readFileSync("modules/nexus-widget/android/src/main/res/layout/nexus_widget.xml", "utf8");

describe("native Companion widgets 2.2", () => {
  it("supports independent content, mood, speech and page-cycle preferences", () => {
    for (const value of ["companion", "finance", "habits", "boss", "happy", "playful", "strict", "silent", "orbit", "ember"]) {
      expect(configure).toContain(`\"${value}\"`);
    }
    expect(provider).toContain("PAGE_MODES");
    expect(provider).toContain("ACTION_NEXT_PAGE");
    expect(layout).toContain("nexus_widget_page");
    expect(provider).toContain("ic_nexus_orbit");
    expect(provider).toContain("ic_nexus_ember");
  });

  it("keeps task and page broadcasts nonce-protected", () => {
    expect(provider.match(/if \(!validNonce\(context, intent\)\) return/g)?.length).toBeGreaterThanOrEqual(2);
    expect(provider).toContain("PendingIntent.FLAG_IMMUTABLE");
  });
});
