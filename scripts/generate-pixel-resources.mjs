import fs from "node:fs";
import { spriteFor, scenePixels, PIXEL_PALETTE, pixelPaths } from "../features/mascot/sprites.ts";
const dir = "modules/nexus-widget/android/src/main/res/drawable";
function vector(rows) {
  const width = rows[0].length, height = rows.length;
  const paths = pixelPaths(rows).map(({ ink, path }) => `  <path android:fillColor="${PIXEL_PALETTE[ink]}" android:pathData="${path}" />`);
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${width * 3}dp" android:height="${height * 3}dp" android:viewportWidth="${width}" android:viewportHeight="${height}">\n${paths.join("\n")}\n</vector>\n`;
}
for (const [file, kind, pose] of [["ic_nexus_mascot", "nexus", "idle"], ["ic_nexus_mascot_reading", "nexus", "reading"], ["ic_nexus_mascot_celebrating", "nexus", "celebrating"], ["ic_nexus_mascot_resting", "nexus", "sleeping"], ["ic_nexus_mascot_watching", "nexus", "thinking"], ["ic_atlas_mascot", "atlas", "idle"], ["ic_atlas_mascot_celebrating", "atlas", "celebrating"], ["ic_atlas_mascot_resting", "atlas", "sleeping"], ["ic_atlas_mascot_watching", "atlas", "thinking"]]) fs.writeFileSync(`${dir}/${file}.xml`, vector(spriteFor(kind, pose)));
for (const scene of ["desk", "garden", "night"]) fs.writeFileSync(`${dir}/nexus_scene_${scene}.xml`, vector(scenePixels(scene)));
