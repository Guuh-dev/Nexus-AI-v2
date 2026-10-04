import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = "modules/nexus-widget/android/src/main";

const families = [
  { name: "mini", layout: "nexus_widget_mini.xml", info: "nexus_widget_mini_info.xml", width: 40, height: 40 },
  { name: "strip", layout: "nexus_widget_strip.xml", info: "nexus_widget_strip_info.xml", width: 110, height: 40 },
  { name: "companion", layout: "nexus_widget_companion.xml", info: "nexus_widget_companion_info.xml", width: 110, height: 110 },
  { name: "mission", layout: "nexus_widget_mission.xml", info: "nexus_widget_mission_info.xml", width: 250, height: 110 },
  { name: "command", layout: "nexus_widget.xml", info: "nexus_widget_info.xml", width: 250, height: 250 },
] as const;

const utilityFamilies = [
  { name: "timer", layout: "nexus_widget_timer.xml", info: "nexus_widget_timer_info.xml", width: 110, height: 110 },
  { name: "capture", layout: "nexus_widget_capture.xml", info: "nexus_widget_capture_info.xml", width: 110, height: 40 },
  { name: "streak", layout: "nexus_widget_streak.xml", info: "nexus_widget_streak_info.xml", width: 250, height: 110 },
] as const;

function dpAttribute(source: string, attribute: string): number {
  const value = source.match(new RegExp(`android:${attribute}="(\\d+)dp"`))?.[1];
  if (!value) throw new Error(`Missing ${attribute}`);
  return Number(value);
}

function rootTag(source: string): string {
  const tag = source.match(/<[A-Za-z]+Layout\b[^>]*android:id="@\+id\/nexus_widget_root"[^>]*>/s)?.[0];
  if (!tag) throw new Error("Missing widget root tag");
  return tag;
}

describe("native widget minimum-size contract", () => {
  it.each([...families, ...utilityFamilies])("keeps $name layout bounds equal to picker metadata", (family) => {
    const metadata = readFileSync(`${root}/res/xml/${family.info}`, "utf8");
    const layout = readFileSync(`${root}/res/layout/${family.layout}`, "utf8");
    const rootElement = rootTag(layout);

    expect(dpAttribute(metadata, "minWidth")).toBe(family.width);
    expect(dpAttribute(metadata, "minHeight")).toBe(family.height);
    expect(dpAttribute(metadata, "minResizeWidth")).toBe(family.width);
    expect(dpAttribute(metadata, "minResizeHeight")).toBe(family.height);
    expect(dpAttribute(rootElement, "minWidth")).toBe(family.width);
    expect(dpAttribute(rootElement, "minHeight")).toBe(family.height);
  });

  it("fits fixed visible content inside the advertised minimum heights", () => {
    const mini = readFileSync(`${root}/res/layout/nexus_widget_mini.xml`, "utf8");
    const strip = readFileSync(`${root}/res/layout/nexus_widget_strip.xml`, "utf8");
    const companion = readFileSync(`${root}/res/layout/nexus_widget_companion.xml`, "utf8");
    const mission = readFileSync(`${root}/res/layout/nexus_widget_mission.xml`, "utf8");
    const command = readFileSync(`${root}/res/layout/nexus_widget.xml`, "utf8");
    const styles = readFileSync(`${root}/res/values/styles.xml`, "utf8");

    expect(mini).toMatch(/nexus_widget_mascot_stage"[\s\S]*?layout_height="0dp"[\s\S]*?layout_weight="1"[\s\S]*?minHeight="16dp"/);
    expect(mini).toMatch(/nexus_widget_mascot"[\s\S]*?layout_width="match_parent"[\s\S]*?layout_height="match_parent"/);
    expect(mini).toMatch(/nexus_widget_streak"[\s\S]*?textSize="9sp"[\s\S]*?maxLines="1"/);
    expect(strip).toContain('android:paddingTop="3dp"');
    expect(strip).toContain('android:paddingBottom="3dp"');
    expect(strip).toContain('android:textSize="10sp"');
    expect(companion).toContain('android:layout_weight="1" android:minHeight="40dp"');
    expect(companion).toContain('android:padding="8dp"');
    expect(mission).toContain('android:paddingTop="8dp"');
    expect(mission).toContain('android:maxLines="2"');
    expect(command).toContain('android:padding="12dp"');
    expect(command).toContain('android:maxLines="2"');
    expect(styles).toMatch(/name="NexusWidgetTaskRow"[\s\S]*?layout_height">20dp</);
  });

  it("does not ship an unrendered professor or learning channel", () => {
    const layouts = families
      .map((family) => readFileSync(`${root}/res/layout/${family.layout}`, "utf8"))
      .join("\n");
    const provider = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetProvider.kt`, "utf8");
    const payload = readFileSync("services/widget.service.ts", "utf8");
    const intake = readFileSync("app/professor-intake.tsx", "utf8");
    const storage = readFileSync("schemas/storage.schema.ts", "utf8");

    expect(layouts).not.toMatch(/nexus_widget_(?:professor|learning)/);
    expect(provider).not.toMatch(/R\.id\.nexus_widget_(?:professor|learning)/);
    expect(payload).not.toMatch(/nextRoadmapLesson|roadmapProgress|showProfessor:|showLearning:|professorVariant:/);
    expect(intake).not.toMatch(/Mostrar aprendizado no widget|Colocar o Professor Atlas no widget/);
    expect(storage).toContain("showProfessor: z.boolean()");
    expect(storage).toContain("showLearning: z.boolean()");
  });

  it("keeps every RemoteViews id available in every family layout", () => {
    const provider = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetProvider.kt`, "utf8");
    const referencedIds = [...new Set(
      [...provider.matchAll(/R\.id\.([A-Za-z0-9_]+)/g)].map((match) => match[1]),
    )];

    expect(referencedIds.length).toBeGreaterThan(10);
    for (const family of families) {
      const layout = readFileSync(`${root}/res/layout/${family.layout}`, "utf8");
      const ids = [...layout.matchAll(/@\+id\/([A-Za-z0-9_]+)/g)].map((m) => m[1]);
      expect(new Set(ids).size, `${family.name} contains duplicate view IDs`).toBe(ids.length);
      for (const id of referencedIds) {
        expect(layout, `${family.name} is missing ${id}`).toContain(`@+id/${id}`);
      }
    }
  });

  it("keeps every utility renderer id inside each utility layout", () => {
    const renderer = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusUtilityWidgets.kt`, "utf8");
    const provider = readFileSync(`${root}/java/expo/modules/nexuswidget/NexusWidgetProvider.kt`, "utf8");
    const prefixes = { timer: "nexus_timer_", capture: "nexus_capture_", streak: "nexus_streak_" } as const;
    const referenced = [...new Set([...renderer.matchAll(/R\.id\.([A-Za-z0-9_]+)/g)].map((match) => match[1]!))];
    // Utility families return before the shared renderer touches the legacy ids.
    const early = provider.indexOf("if (family.utility)");
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(provider.indexOf("resetVisibility(views)\n"));
    for (const family of utilityFamilies) {
      const layout = readFileSync(`${root}/res/layout/${family.layout}`, "utf8");
      expect(layout).toContain('@+id/nexus_widget_root');
      for (const id of referenced.filter((id) => id.startsWith(prefixes[family.name]))) {
        expect(layout, `${family.name} is missing ${id}`).toContain(`@+id/${id}`);
      }
    }
    expect(renderer).not.toContain("R.id.nexus_widget_task_");
    expect(renderer).toContain("nexusai://today?capture=1");
    expect(renderer).toContain("PendingIntent.FLAG_IMMUTABLE");
  });
});
