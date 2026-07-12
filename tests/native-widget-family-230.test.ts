import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = "modules/nexus-widget/android/src/main";
const provider = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetProvider.kt`, "utf8");
const plugin = readFileSync("plugins/withNexusWidget.js", "utf8");

describe("native Widget Family 2.3", () => {
  it("publishes five honest picker entries with layouts sized for their family", () => {
    for (const family of ["Mini", "Strip", "Companion", "Mission"]) {
      expect(provider).toContain(`class Nexus${family}WidgetProvider`);
      expect(plugin).toContain(`Nexus${family}WidgetProvider`);
    }
    for (const info of ["mini", "strip", "companion", "mission"]) {
      const xml = readFileSync(`${root}/res/xml/nexus_widget_${info}_info.xml`, "utf8");
      expect(xml).toContain("android:targetCellWidth");
      expect(xml).toContain("android:previewLayout");
      expect(xml).toContain('android:updatePeriodMillis="0"');
    }
  });

  it("keeps configuration per appWidgetId while sharing one compact payload", () => {
    expect(provider).toContain('"instance_$widgetId"');
    expect(provider).toContain("PAYLOAD_KEY");
    expect(provider).toContain("updateAllWidgetFamilies");
    expect(provider).toContain("providerClassForWidget");
  });

  it("preserves the global completion count when only a subset of tasks is visible", () => {
    expect(provider).toContain('payload.optInt("completedCount", 0) + delta');
    expect(provider).toContain('payload.optInt("totalCount", tasks.length())');
    expect(provider).not.toContain("for (index in 0 until tasks.length()) {\n          if (tasks.optJSONObject(index)?.optBoolean");
  });

  it("propagates privacy mode and hides private metrics", () => {
    const service = readFileSync("services/widget.service.ts", "utf8");
    expect(service).toContain("privacyMode: preferences.privacyMode");
    expect(service).toContain("!privateWidget ? { finance: data.finance }");
    expect(provider).toContain("val showStreak = !privateMode");
    expect(provider).toContain("&& !privateMode");
  });

  it("uses event-driven apparent movement without timers or overlays", () => {
    expect(provider).toContain("nexus_widget_mascot_stage");
    expect(provider).toContain("setViewPadding");
    expect(provider).toContain("celebrating");
    expect(provider).not.toContain("Timer(");
    expect(provider).not.toContain("WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY");
  });

  it("keeps the detailed Nexus pose colors instead of flattening them with tint", () => {
    expect(provider).toContain('if (selectedMascot != "nexus")');
    expect(provider).toContain("celebrating/resting/watching artwork");
  });

  it("offers a truly transparent drawable independently from frosted glass", () => {
    const transparent = readFileSync(`${root}/res/drawable/nexus_widget_background_transparent.xml`, "utf8");
    expect(transparent).toContain("#00000000");
    expect(provider).toContain("nexus_widget_background_transparent");
    expect(provider).toContain("nexus_widget_background_translucent");
  });
});
