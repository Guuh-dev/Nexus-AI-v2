import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PIXEL_PALETTE, scenePixels, spriteFor, type PixelKind, type PixelPose } from "@/features/mascot/sprites";
import { createWidgetRenderSpec, widgetPreferencesPatchFromConfiguration } from "@/features/widget/render-spec";
import { DEFAULT_PREFERENCES } from "@/constants/defaults";
import { getColors } from "@/theme/theme";
const path = "modules/nexus-widget/android/src/main/res/drawable";
function cells(xml: string) { return [...xml.matchAll(/fillColor="([^"]+)" android:pathData="([^"]+)"/g)].flatMap((m) => [...m[2]!.matchAll(/M\d+,\d+h1v1h-1z/g)].map((cell) => `${m[1]}:${cell[0]}`)).sort(); }
it("renders the same Nexus and Atlas pixels in JS and Android for each pose", () => {
  for (const kind of ["nexus", "atlas"] as PixelKind[]) for (const [pose, suffix] of [["idle", ""], ["thinking", "_watching"], ["sleeping", "_resting"], ["celebrating", "_celebrating"]] as [PixelPose, string][]) {
    const rows = spriteFor(kind, pose);
    expect(rows).toHaveLength(24); expect(rows.every((r) => r.length === 24)).toBe(true);
    const xml = readFileSync(`${path}/ic_${kind}_mascot${suffix}.xml`, "utf8");
    const expected = rows.flatMap((r, y) => [...r].flatMap((color, x) => color === "." ? [] : [`${PIXEL_PALETTE[color as keyof typeof PIXEL_PALETTE]}:M${x},${y}h1v1h-1z`]));
    expect(cells(xml)).toEqual(expected.sort());
  }
  expect(spriteFor("nexus", "sleeping")).not.toEqual(spriteFor("nexus", "idle"));
});
it("keeps every habitat pixel identical in the native resource", () => {
  for (const scene of ["desk", "garden", "night"] as const) {
    const rows = scenePixels(scene), xml = readFileSync(`${path}/nexus_scene_${scene}.xml`, "utf8");
    const expected = rows.flatMap((r, y) => [...r].flatMap((color, x) => color === "." ? [] : [`${PIXEL_PALETTE[color as keyof typeof PIXEL_PALETTE]}:M${x},${y}h1v1h-1z`]));
    expect(cells(xml)).toEqual(expected.sort());
  }
});
describe("per-instance decorations and privacy", () => {
 it("round trips habitat and visibility while preserving the global privacy floor", () => {
   const colors = getColors(DEFAULT_PREFERENCES);
   const spec = createWidgetRenderSpec({ ...DEFAULT_PREFERENCES.widget, privacyMode: true }, colors, { family: "command", scene: "night", showMascot: false, showMetric: false, privateMode: false });
   expect(spec.scene).toBe("night"); expect(spec.mascot.visible).toBe(false); expect(spec.privateMode).toBe(true); expect(spec.actions.taskToggle).toBe(false);
   const patch = widgetPreferencesPatchFromConfiguration({ family: "companion", style: "transparent", accentColor: "#9FE4CE", opacityPercent: 0, content: "companion", mascot: "atlas", personality: "calm", speech: "silent", tapAction: "focus", privateMode: true, scene: "night", showMascot: false, showMetric: false });
   const roundTrip = createWidgetRenderSpec({ ...DEFAULT_PREFERENCES.widget, ...patch }, colors);
   expect(roundTrip.scene).toBe("night");expect(roundTrip.mascot.visible).toBe(false);expect(roundTrip.style).toBe("transparent");expect(roundTrip.opacityPercent).toBe(0);
 });
 it("does not add habitats to compact task families", () => {
   for (const family of ["mini", "strip", "mission"] as const) expect(createWidgetRenderSpec(DEFAULT_PREFERENCES.widget, getColors(DEFAULT_PREFERENCES), { family, scene: "night" }).scene).toBe("none");
 });
});

it("distinguishes all seven personalities without replacing a recorded pose, with native pixel parity", async () => {
  const { personalitySprite } = await import("@/features/mascot/sprites");
  for (const kind of ["nexus", "atlas"] as const) {
    const moods = ["happy", "playful", "motivational", "serious", "strict", "calm", "quiet"] as const;
    expect(new Set(moods.map(mood => personalitySprite(kind, mood).join("\n"))).size).toBe(7);
    for (const mood of moods) for (const pose of ["idle", "thinking", "sleeping", "celebrating", "warning", "reading"] as const) {
      const rows = personalitySprite(kind, mood, pose);
      const xml = readFileSync(`${path}/ic_${kind}_personality_${mood}_${pose}.xml`, "utf8");
      const expected = rows.flatMap((row, y) => [...row].flatMap((ink, x) => ink === "." ? [] : [`${PIXEL_PALETTE[ink as keyof typeof PIXEL_PALETTE]}:M${x},${y}h1v1h-1z`]));
      expect(cells(xml)).toEqual(expected.sort());
    }
  }
});
