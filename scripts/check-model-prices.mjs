#!/usr/bin/env node
// Weekly guard: every allowlisted model must keep at least two ZDR endpoints
// priced within the routing policy cap. Uses public OpenRouter metadata only;
// no API key is read or sent.
import { readFileSync } from "node:fs";

const MIN_ENDPOINTS = 2;
const policy = readFileSync(new URL("../services/openrouter-policy.ts", import.meta.url), "utf8");
const models = readFileSync(new URL("../constants/models.ts", import.meta.url), "utf8");
const cap = {
  prompt: Number(policy.match(/prompt:\s*"([\d.]+)"/)?.[1]),
  completion: Number(policy.match(/completion:\s*"([\d.]+)"/)?.[1]),
};
const allowlist = [
  models.match(/export const PRIMARY_MODEL = "([^"]+)"/)?.[1],
  models.match(/export const SECONDARY_MODEL = "([^"]+)"/)?.[1],
];
if (!Number.isFinite(cap.prompt) || !Number.isFinite(cap.completion) || allowlist.some((id) => !id)) {
  console.error("Could not read the price cap or the model allowlist from source.");
  process.exit(2);
}

const response = await fetch("https://openrouter.ai/api/v1/endpoints/zdr", { signal: AbortSignal.timeout(20_000) });
if (!response.ok) {
  console.error(`OpenRouter ZDR listing returned HTTP ${response.status}.`);
  process.exit(2);
}
const { data } = await response.json();
const perMillion = (value) => Number(value) * 1_000_000;

let failed = false;
for (const id of allowlist) {
  const endpoints = data.filter((endpoint) => endpoint.model_id === id);
  const eligible = endpoints.filter((endpoint) =>
    perMillion(endpoint.pricing?.prompt) <= cap.prompt && perMillion(endpoint.pricing?.completion) <= cap.completion);
  console.log(`${id}: ${eligible.length}/${endpoints.length} ZDR endpoints within $${cap.prompt}/$${cap.completion} per 1M tokens`);
  for (const endpoint of endpoints) {
    const mark = eligible.includes(endpoint) ? "ok " : "cap";
    console.log(`  [${mark}] ${endpoint.provider_name}: $${perMillion(endpoint.pricing?.prompt).toFixed(4)} / $${perMillion(endpoint.pricing?.completion).toFixed(4)}`);
  }
  if (eligible.length < MIN_ENDPOINTS) failed = true;
}
if (failed) {
  console.error(`At least one allowlisted model has fewer than ${MIN_ENDPOINTS} eligible ZDR endpoints. Review constants/models.ts and services/openrouter-policy.ts before users hit routing errors.`);
  process.exit(1);
}
