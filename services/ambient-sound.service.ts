import * as FileSystem from "expo-file-system/legacy";
import type { AmbientSound } from "@/types";

const SAMPLE_RATE = 8_000;
const DURATION_SECONDS = 6;

function randomFactory(seed: number) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 0xffffffff; };
}

function sampleFor(sound: AmbientSound, index: number, random: () => number, state: { brown: number }): number {
  const t = index / SAMPLE_RATE;
  const white = random() * 2 - 1;
  if (sound === "ruido_branco") return white * 0.2;
  if (sound === "ruido_marrom") { state.brown = Math.max(-1, Math.min(1, state.brown * 0.985 + white * 0.035)); return state.brown * 0.45; }
  if (sound === "chuva") { state.brown = state.brown * 0.92 + white * 0.08; const drop = random() > 0.997 ? (random() * 2 - 1) * 0.55 : 0; return state.brown * 0.22 + drop; }
  if (sound === "floresta") { state.brown = state.brown * 0.97 + white * 0.025; const bird = Math.sin(2 * Math.PI * (900 + Math.sin(t * 0.6) * 350) * t) * (Math.sin(t * 2.1) > 0.985 ? 0.12 : 0); return state.brown * 0.18 + bird; }
  if (sound === "cafeteria") { state.brown = state.brown * 0.94 + white * 0.04; return state.brown * 0.2 + Math.sin(2 * Math.PI * 90 * t) * 0.025 + Math.sin(2 * Math.PI * 143 * t) * 0.018; }
  if (sound === "espaco") return (Math.sin(2 * Math.PI * 74 * t) + Math.sin(2 * Math.PI * 111 * t) * 0.55 + Math.sin(2 * Math.PI * 0.08 * t) * 0.3) * 0.08;
  return 0;
}

function base64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0; const b = bytes[index + 1] ?? 0; const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    result += chars.charAt((triple >> 18) & 63) + chars.charAt((triple >> 12) & 63) + (index + 1 < bytes.length ? chars.charAt((triple >> 6) & 63) : "=") + (index + 2 < bytes.length ? chars.charAt(triple & 63) : "=");
  }
  return result;
}

function wav(sound: AmbientSound): Uint8Array {
  const samples = SAMPLE_RATE * DURATION_SECONDS;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const word = (offset: number, value: string) => { for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i); };
  word(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); word(8, "WAVE"); word(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, "data"); view.setUint32(40, samples * 2, true);
  const random = randomFactory([...sound].reduce((sum, char) => sum + char.charCodeAt(0), 17));
  const state = { brown: 0 };
  for (let index = 0; index < samples; index += 1) view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, sampleFor(sound, index, random, state))) * 32767), true);
  return bytes;
}

export async function ambientSoundUri(sound: AmbientSound): Promise<string | null> {
  if (sound === "nenhum" || !FileSystem.cacheDirectory) return null;
  const uri = `${FileSystem.cacheDirectory}nexus-${sound}.wav`;
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) await FileSystem.writeAsStringAsync(uri, base64(wav(sound)), { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}
