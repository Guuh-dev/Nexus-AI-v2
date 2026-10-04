export type PixelPose = "idle" | "thinking" | "celebrating" | "sleeping" | "warning" | "reading";
export type PixelKind = "nexus" | "atlas";
export const PIXEL_PALETTE = { b: "#AC78F4", l: "#D7B8FF", s: "#7140B2", e: "#FFF8FF", d: "#171329", a: "#8CDEC1", m: "#D5FFEE", g: "#459D86", t: "#352357", u: "#4A3075", y: "#F6D782" };
type Ink = keyof typeof PIXEL_PALETTE;
function canvas(width: number, height: number) {
  const pixels = Array.from({ length: height }, () => Array.from({ length: width }, () => "."));
  const paint = (x: number, y: number, w: number, h: number, color: Ink) => { for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) if (pixels[row]?.[col] !== undefined) pixels[row]![col] = color; };
  return { paint, rows: () => pixels.map((r) => r.join("")) };
}
/** One source grid for React Native cells and generated Android vectors. No antialiasing. */
export function spriteFor(kind: PixelKind, pose: PixelPose = "idle"): string[] {
  const c = canvas(24, 24), p = c.paint;
  if (kind === "nexus") {
    if (pose === "sleeping") {
      p(3, 15, 17, 5, "b"); p(4, 12, 8, 4, "b"); p(1, 16, 3, 3, "b"); p(8, 19, 14, 2, "s"); p(6, 14, 3, 1, "l"); p(13, 17, 3, 1, "l"); p(19, 7, 3, 1, "l"); p(21, 8, 1, 1, "l"); p(19, 9, 3, 1, "l"); p(18, 3, 2, 1, "l"); p(19, 4, 1, 1, "l"); p(18, 5, 2, 1, "l"); return c.rows();
    }
    p(7, 2, 6, 2, "b"); p(11, 4, 2, 3, "b"); p(9, 6, 10, 3, "b"); p(7, 9, 13, 11, "b"); p(3, 12, 5, 6, "b"); p(6, 18, 12, 3, "b"); p(7, 21, 3, 2, "b"); p(15, 21, 4, 2, "b"); p(10, 19, 4, 2, "s"); p(17, 18, 3, 2, "s"); p(8, 7, 5, 1, "l"); p(8, 10, 2, 3, "e"); p(16, 10, 2, 3, "e"); p(16, 18, 2, 2, "a");
    if (pose === "reading") { p(11, 17, 5, 4, "l"); p(16, 18, 6, 4, "b"); p(10, 16, 6, 1, "e"); p(16, 17, 6, 1, "e"); p(15, 18, 1, 4, "s"); p(11, 21, 4, 1, "s"); }
    if (pose === "thinking") { p(5, 5, 2, 2, "l"); p(3, 3, 1, 1, "l"); p(18, 4, 1, 2, "l"); p(20, 2, 1, 2, "l"); }
    if (pose === "celebrating") { p(1, 9, 2, 6, "b"); p(3, 13, 3, 3, "b"); p(20, 9, 2, 6, "b"); p(17, 16, 3, 4, "b"); p(11, 14, 1, 1, "e"); p(14, 14, 1, 1, "e"); p(12, 15, 2, 1, "e"); p(3, 1, 1, 3, "l"); p(2, 2, 3, 1, "l"); p(21, 3, 1, 3, "l"); p(20, 4, 3, 1, "l"); }
  } else {
    p(4, 2, 5, 2, "a"); p(11, 2, 5, 2, "a"); p(7, 4, 9, 3, "a"); p(5, 7, 14, 12, "a"); p(3, 10, 3, 7, "a"); p(18, 11, 3, 6, "a"); p(6, 19, 12, 2, "a"); p(7, 21, 3, 2, "a"); p(15, 21, 3, 2, "a"); p(5, 8, 6, 7, "d"); p(13, 8, 7, 7, "d"); p(11, 10, 2, 1, "d"); p(6, 9, 4, 5, "e"); p(14, 9, 5, 5, "e"); p(8, 10, 1, 3, "d"); p(16, 10, 1, 3, "d"); p(4, 7, 5, 1, "m"); p(11, 19, 5, 2, "g");
    if (pose === "sleeping") { p(14, 16, 5, 4, "e"); p(19, 17, 2, 2, "e"); p(15, 17, 3, 2, "m"); p(18, 3, 3, 1, "a"); p(20, 4, 1, 2, "a"); p(19, 5, 2, 1, "a"); }
    else { p(10, 16, 5, 4, "l"); p(15, 17, 5, 4, "b"); p(9, 15, 6, 1, "e"); p(15, 16, 6, 1, "e"); p(14, 17, 1, 4, "s"); }
    if (pose === "thinking" || pose === "warning") { p(21, 3, 1, 3, "y"); p(20, 7, 3, 1, "y"); }
    if (pose === "celebrating") { for (const [x, y] of [[2, 3], [21, 4], [1, 18]]) { p(x!, y!, 1, 3, "y"); p(x! - 1, y! + 1, 3, 1, "y"); } }
  }
  if (pose === "warning") { p(21, 1, 1, 3, "y"); p(21, 5, 1, 1, "y"); }
  return c.rows();
}
/** Personality changes the character, never its observed execution state. */
export function personalitySprite(kind: PixelKind, mood: "happy" | "playful" | "motivational" | "serious" | "strict" | "calm" | "quiet", pose: PixelPose = "idle"): string[] {
  const rows = spriteFor(kind, pose).map((row) => [...row]);
  const paint = (x: number, y: number, w: number, h: number, ink: Ink | ".") => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (rows[j]?.[i] !== undefined) rows[j]![i] = ink;
  };
  // Eyes stay closed during a recorded pause; visual personality is an accent.
  if (mood === "happy") { paint(1, 3, 1, 3, "l"); paint(0, 4, 3, 1, "l"); paint(21, 17, 1, 3, "y"); paint(20, 18, 3, 1, "y"); }
  if (mood === "playful" && pose !== "sleeping") { paint(kind === "nexus" ? 16 : 15, 10, 3, 3, kind === "nexus" ? "b" : "e"); paint(kind === "nexus" ? 16 : 15, 11, 3, 1, kind === "nexus" ? "e" : "d"); paint(21, 5, 2, 2, "l"); }
  if (mood === "motivational") { paint(21, 1, 1, 6, "y"); paint(20, 2, 3, 1, "y"); paint(19, 3, 1, 1, "y"); paint(23, 3, 1, 1, "y"); }
  if (mood === "serious" && pose !== "sleeping") { paint(8, 8, 2, 1, "s"); paint(16, 8, 2, 1, "s"); }
  if (mood === "strict") { paint(21, 3, 1, 3, "y"); paint(21, 7, 1, 1, "y"); if (pose !== "sleeping") { paint(8, 9, 2, 1, "s"); paint(16, 9, 2, 1, "s"); } }
  if (mood === "calm") { paint(1, 19, 1, 4, "g"); paint(0, 18, 2, 2, "a"); paint(2, 20, 2, 1, "a"); }
  if (mood === "quiet") { paint(18, 0, 1, 1, "l"); paint(20, 0, 1, 1, "l"); paint(22, 0, 1, 1, "l"); }
  return rows.map((row) => row.join(""));
}

/** Decorative habitat only: no task or activity claims are encoded in scenery. */
export function scenePixels(scene: "desk" | "garden" | "night"): string[] {
  const c = canvas(64, 40), p = c.paint;
  p(0, 33, 64, 3, "u"); p(0, 36, 64, 4, "t");
  for (const x of [0, 8, 19, 29, 43, 54]) { p(x, 32, 4, 1, "s"); p(x + 2, 36, 3, 2, "u"); }
  const plant = (x: number, y: number) => { p(x, y, 2, 8, "g"); p(x - 3, y + 2, 3, 2, "a"); p(x + 2, y, 3, 2, "a"); p(x - 1, y - 2, 3, 2, "a"); };
  plant(5, 25); plant(49, 25); plant(58, 22);
  if (scene === "desk") { p(16, 27, 31, 2, "s"); p(18, 29, 2, 6, "u"); p(43, 29, 2, 6, "u"); p(20, 15, 15, 10, "b"); p(22, 17, 11, 6, "t"); p(25, 19, 5, 1, "a"); p(23, 25, 9, 2, "s"); p(39, 23, 4, 4, "m"); p(43, 24, 2, 2, "m"); }
  if (scene === "garden" || scene === "night") {
    for (const [x, y] of [[54, 14], [58, 7], [51, 21], [60, 24]]) { p(x!, y!, 4, 8, "t"); p(x! - 2, y! + 2, 8, 3, "u"); p(x! - 1, y! + 1, 3, 2, "s"); }
    plant(12, 27); p(19, 30, 22, 3, "s"); p(21, 33, 19, 3, "u");
  }
  if (scene === "night") {
    p(45, 3, 2, 7, "l"); p(44, 5, 2, 4, "l"); p(47, 8, 4, 3, "l"); p(46, 9, 2, 2, "l");
    for (const [x, y] of [[5, 9], [13, 4], [28, 6], [38, 14], [57, 3], [17, 19]]) { p(x!, y!, 1, 1, "l"); }
    p(27, 15, 1, 3, "l"); p(26, 16, 3, 1, "l");
  }
  if (scene === "garden") { p(43, 4, 5, 5, "y"); p(41, 6, 9, 1, "y"); }
  return c.rows();
}

export function pixelPaths(rows: string[]): { ink: keyof typeof PIXEL_PALETTE; path: string }[] {
  const groups = new Map<keyof typeof PIXEL_PALETTE, string[]>();
  rows.forEach((row, y) => [...row].forEach((ink, x) => {
    if (ink === ".") return;
    if (!(ink in PIXEL_PALETTE)) throw new Error("Unknown pixel palette color");
    const key = ink as keyof typeof PIXEL_PALETTE;
    const cells = groups.get(key) ?? []; cells.push(`M${x},${y}h1v1h-1z`); groups.set(key, cells);
  }));
  return [...groups].map(([ink, cells]) => ({ ink, path: cells.join("") }));
}
