import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  distanceFromChatEnd,
  isChatAtEnd,
  shouldShowChatJump,
} from "@/components/brain/chat-scroll";
import { resolveKeyboardOcclusion } from "@/components/brain/keyboard-occlusion";

describe("Brain chat OTA layout", () => {
  it("keeps following streaming content while the reader is near the end", () => {
    expect(
      isChatAtEnd({ offset: 1_410, viewport: 500, content: 2_000 }),
    ).toBe(true);
    expect(
      isChatAtEnd({ offset: 900, viewport: 500, content: 2_000 }),
    ).toBe(false);
  });

  it("offers an explicit jump only when the reader is meaningfully above", () => {
    expect(
      shouldShowChatJump({ offset: 1_200, viewport: 500, content: 2_000 }),
    ).toBe(true);
    expect(
      shouldShowChatJump({ offset: 1_360, viewport: 500, content: 2_000 }),
    ).toBe(false);
  });

  it("never returns a negative distance for short conversations", () => {
    expect(
      distanceFromChatEnd({ offset: 0, viewport: 700, content: 320 }),
    ).toBe(0);
  });

  it("uses an OTA-safe virtualized list and fixed composer", () => {
    const screen = readFileSync("app/(tabs)/brain.tsx", "utf8");
    const list = readFileSync("components/BrainChatList.tsx", "utf8");

    expect(screen).toContain("<KeyboardAvoidingView");
    expect(screen).toContain('enabled={Platform.OS === "ios"}');
    expect(screen).not.toContain('Platform.OS === "ios" ? "padding" : "height"');
    expect(screen).toContain('key={active.id}');
    expect(screen).toContain('accessibilityLiveRegion="polite"');
    expect(screen).toContain("maxWidth: 760");
    expect(screen).toContain("<BrainChatList");
    expect(screen).toContain("scroll={false}");
    expect(list).toContain("<FlatList");
    expect(list).toContain("useLayoutEffect");
    expect(list).toContain("onLayout={restoreOrFollow}");
    expect(list).toContain("↓ Ir ao final");
    expect(list).toContain("scrollToEnd({ animated: false })");
    expect(screen).toContain("resolveKeyboardOcclusion");
    expect(screen).toContain('Keyboard.addListener("keyboardDidShow"');
    expect(list).toContain("reflowAfterKeyboard");
  });

  it("compensates only for IME space Android did not resize", () => {
    expect(resolveKeyboardOcclusion({ keyboardHeight: 420, baselineHeight: 760, viewportHeight: 760 })).toBe(420);
    expect(resolveKeyboardOcclusion({ keyboardHeight: 420, baselineHeight: 760, viewportHeight: 340 })).toBe(0);
    expect(resolveKeyboardOcclusion({ keyboardHeight: 420, baselineHeight: 760, viewportHeight: 500 })).toBe(160);
    expect(resolveKeyboardOcclusion({ keyboardHeight: 0, baselineHeight: 760, viewportHeight: 760 })).toBe(0);
  });
});
