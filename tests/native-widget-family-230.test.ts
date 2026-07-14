import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = "modules/nexus-widget/android/src/main";
const provider = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetProvider.kt`, "utf8");
const moduleSource = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetModule.kt`, "utf8");
const configure = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetConfigureActivity.kt`, "utf8");
const plugin = readFileSync("plugins/withNexusWidget.js", "utf8");

describe("native Widget Family 3.0", () => {
  it("publishes exactly the five useful picker families", () => {
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
    expect(plugin.match(/info: "@xml\//g)).toHaveLength(5);
    expect(plugin).not.toContain("3x2");
    expect(plugin).not.toContain("4x1");
    expect(plugin).not.toContain("4x3");
    expect(plugin).not.toContain("5x2");
  });

  it("persists, lists and redraws configuration by appWidgetId", () => {
    expect(moduleSource).toContain('AsyncFunction("listWidgetInstances")');
    expect(moduleSource).toContain('AsyncFunction("saveWidgetConfiguration")');
    expect(moduleSource).toContain('putString("instance_$appWidgetId"');
    expect(moduleSource).toContain("getAppWidgetInfo(appWidgetId)");
    expect(moduleSource).toContain("updateAllWidgetFamilies");
    expect(provider).toContain('"instance_$widgetId"');
    expect(provider).toContain("providerClassForWidget");
  });

  it("consumes the shared render spec and fixes float/int opacity", () => {
    expect(provider).toContain('payload?.optJSONObject("renderSpecs")');
    expect(provider).toContain('payload?.optJSONObject("renderSpec")');
    expect(provider).toContain("normalizeOpacityPercent");
    expect(provider).toContain("if (value <= 1.0) value * 100.0 else value");
    for (const opacity of [50, 70, 85, 96]) {
      expect(provider).toContain(`nexus_widget_background_${opacity}`);
    }
  });

  it("enforces family fields and task limits in native code", () => {
    expect(provider).toContain('MISSION("mission", R.layout.nexus_widget_mission, 2)');
    expect(provider).toContain('COMMAND("command", R.layout.nexus_widget, 4)');
    expect(provider).toContain("spec.taskLimit.coerceAtMost(spec.family.taskLimit)");
    expect(provider).toContain("renderMini");
    expect(provider).toContain("renderStrip");
    expect(provider).toContain("renderCompanion");
    expect(provider).toContain("renderMission");
    expect(provider).toContain("renderCommand");
    expect(provider).toContain('(spec.family == NexusWidgetFamily.MISSION && spec.content == "tasks")');
    expect(provider).toContain('if (spec.content == "tasks" && !spec.privateMode) View.GONE else View.VISIBLE');
    expect(provider).toContain('views.setTextViewText(R.id.nexus_widget_mission, "Missão protegida")');

    const mission = readFileSync(`${root}/res/layout/nexus_widget_mission.xml`, "utf8");
    const visibleMission = mission.slice(0, mission.indexOf('android:visibility="gone" android:orientation="vertical"'));
    expect(visibleMission).toContain("nexus_widget_task_1");
    expect(visibleMission).toContain("nexus_widget_task_2");
    expect(visibleMission).not.toContain("nexus_widget_task_3");
  });

  it("keeps protected Strip copy visible and never exposes task controls", () => {
    expect(provider).toContain('views.setTextViewText(R.id.nexus_widget_mission, "Próxima ação protegida")');
    expect(provider).toContain("allowToggle = spec.taskToggle && !spec.privateMode");
    expect(provider).not.toContain('if (spec.content == "tasks" || spec.privateMode) View.GONE else View.VISIBLE');
  });

  it("offers only five reproducible styles and real transparent/AMOLED resources", () => {
    for (const style of ["nexus", "amoled", "transparent", "pixel", "minimal"]) {
      expect(configure).toContain(`"${style}"`);
    }
    for (const removed of ["glass", "gamer", "neon", "mascot", "light"]) {
      expect(configure).not.toContain(`"${removed}" to`);
    }
    const transparent = readFileSync(`${root}/res/drawable/nexus_widget_background_transparent.xml`, "utf8");
    const amoled = readFileSync(`${root}/res/drawable/nexus_widget_background_amoled.xml`, "utf8");
    expect(transparent).toContain("#00000000");
    expect(amoled).toContain("#FF000000");
  });

  it("keeps completion idempotence, nonce security and bounded queues", () => {
    expect(provider).toContain('payload.optInt("completedCount", 0) + delta');
    expect(provider).toContain('payload.optInt("totalCount", tasks.length())');
    expect(provider).toContain("ACTION_NONCE_KEY");
    expect(provider).toContain("if (!validNonce(context, intent)) return");
    expect(provider).toContain("PendingIntent.FLAG_IMMUTABLE");
    expect(provider).toContain("pending.length() - 48");
  });

  it("allowlists configuration targets and normalizes legacy behavior", () => {
    expect(configure).toContain("familyForProviderClass(providerName)?.storageName");
    expect(configure).toContain("if (family == null)");
    expect(configure).toContain("loadConfiguration(preferences, family)");
    expect(configure).toContain('"mission" -> listOf("mission" to "Missão + progresso", "tasks" to "Duas tarefas + progresso")');
    expect(configure).toContain("val isPrivate = globalPrivateMode || instancePrivateMode");
    expect(configure).toContain('listOf("true" to "Modo privado (exigido pelo padrão global)")');
    expect(configure).toContain('privacyFloor || selected(privateMode, "false") == "true"');
    expect(moduleSource).toContain('val speeches = setOf("contextual", "silent")');
    expect(moduleSource).toContain('val tapActions = setOf("today", "brain", "focus", "progress")');
    expect(provider).toContain("normalizeTapAction");
    expect(provider).toContain("migrateInstanceConfiguration");
    expect(provider).toContain('val globalPrivateMode = shared.optBoolean("privateMode", false) ||');
    expect(provider).not.toMatch(/nexusai:\/\/(finance|habits|week)/);
    expect(provider).not.toContain("nexusai://today?capture=1");
  });

  it("ships honest launcher previews without orphaned legacy backgrounds", () => {
    const previews = ["nexus_widget", "nexus_widget_mini", "nexus_widget_strip", "nexus_widget_companion", "nexus_widget_mission"]
      .map((layoutName) => readFileSync(`${root}/res/layout/${layoutName}.xml`, "utf8"));
    expect(previews.join("\n")).toContain("NEXUS COMMAND");
    expect(previews.join("\n")).toContain("NEXUS COMPANION");
    expect(previews.join("\n")).toContain("●●●○○○○○  2/5");
    for (const orphan of ["gamer", "light", "neon", "translucent"]) {
      expect(existsSync(`${root}/res/drawable/nexus_widget_background_${orphan}.xml`)).toBe(false);
    }
  });

  it("keeps bounded text, useful empty states and untinted mascot palettes", () => {
    for (const layoutName of ["nexus_widget", "nexus_widget_mini", "nexus_widget_strip", "nexus_widget_companion", "nexus_widget_mission"]) {
      const layout = readFileSync(`${root}/res/layout/${layoutName}.xml`, "utf8");
      expect(layout).toMatch(/android:padding|android:paddingLeft/);
      expect(layout).toContain('android:id="@+id/nexus_widget_mascot"');
      expect(layout).toContain('android:scaleType="fitCenter"');
    }
    expect(provider).toContain("defaultEmptyTitle");
    expect(provider).toContain("defaultEmptyBody");
    expect(provider).toContain("Accent colors belong to chrome and typography");
    expect(provider).not.toContain('setColorFilter", mascotColor');
  });
});
