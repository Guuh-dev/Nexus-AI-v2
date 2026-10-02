/** Run with Node 22 --experimental-strip-types; sharp comes from the Expo image toolchain. */
import fs from "node:fs";
import { createRequire } from "node:module";
import { spriteFor, pixelPaths, PIXEL_PALETTE } from "../features/mascot/sprites.ts";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const rows = spriteFor("nexus", "idle");
function svg(size, scale, background) {
  // Center the occupied silhouette, not the grid's transparent bounds.
  const x = size / 2 - 11.5 * scale, y = size / 2 - 12.5 * scale;
  const pixels = pixelPaths(rows).map(({ ink, path }) => `<path fill="${PIXEL_PALETTE[ink]}" d="${path}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${background ? `<rect width="${size}" height="${size}" fill="#101218"/>` : ""}<g transform="translate(${x} ${y}) scale(${scale})" shape-rendering="crispEdges">${pixels}</g></svg>\n`;
}
for (const [name, size, scale, background] of [["icon", 1024, 30, true], ["adaptive-icon", 1024, 24, false], ["splash", 512, 16, false], ["favicon", 48, 2, true]]) {
  const source = svg(size, scale, background);
  fs.writeFileSync(`assets/source/${name}.svg`, source);
  await sharp(Buffer.from(source)).png().toFile(`assets/${name}.png`);
}
