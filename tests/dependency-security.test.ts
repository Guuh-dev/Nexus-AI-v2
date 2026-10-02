import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const root = createRequire(import.meta.url);
const expo = createRequire(root.resolve("expo/package.json"));
const config = createRequire(expo.resolve("@expo/metro-config/package.json"));
const metro = createRequire(config.resolve("metro/package.json"));
const router = createRequire(root.resolve("expo-router/package.json"));
describe("security updates preserve the installed Expo contracts", () => {
  it("reads the real app image assets through Metro's Buffer API", () => {
    const assets = metro("./src/Assets.js") as { getAssetSize: (type: string, bytes: Buffer, path: string) => { width: number; height: number } };
    for (const file of ["icon.png", "adaptive-icon.png", "splash.png", "favicon.png"]) {
      const path = new URL(`../assets/${file}`, import.meta.url);
      const result = assets.getAssetSize("png", readFileSync(path), path.pathname);
      expect(result.width).toBeGreaterThan(0);expect(result.height).toBeGreaterThan(0);
    }
  });
  it("reads filesystem assets through the async size API used by the Expo export", async () => {
    const assets = metro("./src/Assets.js") as { getAssetData: (path: string, localPath: string, plugins: string[], platform: string, publicPath: string) => Promise<{ width: number; height: number }> };
    for (const file of ["icon.png", "adaptive-icon.png", "splash.png", "favicon.png"]) {
      const result = await assets.getAssetData(new URL(`../assets/${file}`, import.meta.url).pathname, `assets/${file}`, [], "web", "/assets");
      expect(result.width).toBeGreaterThan(0);expect(result.height).toBeGreaterThan(0);
    }
  });
  it("keeps Router query parsing, Unicode, plus signs and repeated parameters compatible", () => {
    const query = router("query-string") as { parse: (s: string) => Record<string, unknown>; stringify: (s: Record<string, unknown>) => string };
    expect({ ...query.parse("taskId=t-1&name=Jo%C3%A3o+Silva&literal=%2B&tag=a&tag=b") }).toEqual({ taskId: "t-1", name: "João Silva", literal: "+", tag: ["a", "b"] });
    expect({ ...query.parse(query.stringify({ next: "/focus?taskId=t-1", title: "Ação + entrega" })) }).toEqual({ next: "/focus?taskId=t-1", title: "Ação + entrega" });
  });
  it("terminates on malformed image boxes and long invalid percent encodings", () => {
    const script = `const {createRequire}=require('node:module');const metro=createRequire(${JSON.stringify(metro.resolve("./package.json"))});const imageSize=(data)=>metro('./src/Assets.js').getAssetSize('png',data,'malformed.png');const bad=Buffer.alloc(24);bad.write('icns');bad.writeUInt32BE(24,4);bad.write('ic07',8);bad.writeUInt32BE(8,12);bad.write('ic07',16);try{imageSize(bad)}catch{}const jxl=Buffer.alloc(20);jxl.writeUInt32BE(12);jxl.write('JXL ',4);try{imageSize(jxl)}catch{}const router=createRequire(${JSON.stringify(router.resolve("./package.json"))});const query=router('query-string');const result=query.parse('value='+('%C0%AF'.repeat(20000)));if(typeof result.value!=='string')process.exit(2);process.stdout.write('terminated');`;
    const result = spawnSync(process.execPath, ["-e", script], { timeout: 3000, encoding: "utf8" });
    expect(result.error).toBeUndefined();expect(result.status).toBe(0);expect(result.stdout).toBe("terminated");
  });
});
