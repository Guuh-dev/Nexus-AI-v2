import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const provider = readFileSync(
  "modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetProvider.kt",
  "utf8",
);
const moduleSource = readFileSync(
  "modules/nexus-widget/android/src/main/java/expo/modules/nexuswidget/NexusWidgetModule.kt",
  "utf8",
);

describe("native widget security", () => {
  it("requires a private nonce for exported task broadcasts", () => {
    expect(provider).toContain("ACTION_NONCE_KEY");
    expect(provider).toContain("expectedNonce != intent.getStringExtra(EXTRA_NONCE)");
    expect(provider).toContain("PendingIntent.FLAG_IMMUTABLE");
  });

  it("bounds payloads and synchronizes the action queue", () => {
    expect(moduleSource).toContain("32_768");
    expect(moduleSource).toContain("synchronized(NexusWidgetProvider::class.java)");
    expect(moduleSource).toContain(".commit()");
  });
});
