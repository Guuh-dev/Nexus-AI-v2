import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNexus } from "@/providers/NexusProvider";
import { ThemeBackdrop } from "@/components/ThemeBackdrop";
import { KeyboardAwareFormContext } from "@/components/ui/KeyboardAwareContext";
import { resolveKeyboardOcclusion } from "@/components/brain/keyboard-occlusion";

type Props = PropsWithChildren<{
  scroll?: boolean;
  footer?: ReactNode;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  padded?: boolean;
  keyboardAware?: boolean;
  keyboardVerticalOffset?: number;
  maxWidth?: number;
}>;

export function Screen({
  children,
  scroll = true,
  footer,
  contentContainerStyle,
  padded = true,
  keyboardAware = true,
  keyboardVerticalOffset = 0,
  maxWidth = 760,
}: Props) {
  const { colors } = useNexus();
  const scrollRef = useRef<ScrollView | null>(null);
  const baselineHeight = useRef(0);
  const scrollOffset = useRef(0);
  const focusedField = useRef<{ y: number; height: number } | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardInset = keyboardAware && Platform.OS === "android"
    ? resolveKeyboardOcclusion({
        keyboardHeight,
        baselineHeight: baselineHeight.current,
        viewportHeight,
      })
    : 0;

  const scrollFocusedField = useCallback(() => {
    if (!keyboardAware || !scroll || Platform.OS === "web") return;
    const field = focusedField.current;
    if (!field) return;
    const visibleBottom = Math.max(120, viewportHeight - keyboardInset - 96);
    const fieldBottom = field.y + field.height;
    if (fieldBottom - scrollOffset.current <= visibleBottom) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, fieldBottom - visibleBottom + 24),
      animated: !keyboardInset,
    });
  }, [keyboardAware, keyboardInset, scroll, viewportHeight]);

  useEffect(() => {
    if (!keyboardAware) return undefined;
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(Math.max(0, event.endCoordinates.height));
        setTimeout(scrollFocusedField, 80);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardAware, scrollFocusedField]);

  useEffect(() => {
    if (keyboardInset > 0) setTimeout(scrollFocusedField, 60);
  }, [keyboardInset, scrollFocusedField]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setViewportHeight(height);
    if (keyboardHeight === 0) baselineHeight.current = Math.max(baselineHeight.current, height);
  }, [keyboardHeight]);

  const context = useMemo(
    () => ({
      scrollRef,
      registerFocusedField: (y: number, height: number) => {
        focusedField.current = { y, height };
        setTimeout(scrollFocusedField, 80);
      },
    }),
    [scrollFocusedField],
  );

  const innerStyle = useMemo(
    () => [
      styles.inner,
      { maxWidth },
      padded && styles.padded,
      contentContainerStyle,
    ],
    [contentContainerStyle, maxWidth, padded],
  );

  const content = <View style={innerStyle}>{children}</View>;
  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: colors.background, paddingBottom: keyboardInset },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      contentInsetAdjustmentBehavior="automatic"
      onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{content}</View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
      onLayout={onLayout}
    >
      <ThemeBackdrop />
      <KeyboardAwareFormContext.Provider value={context}>
        <KeyboardAvoidingView
          style={styles.flex}
          enabled={keyboardAware && Platform.OS === "ios"}
          behavior="padding"
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {body}
          {footer ? (
            <View
              style={[
                styles.footer,
                keyboardInset > 0 && { marginBottom: keyboardInset },
                {
                  backgroundColor: colors.background,
                  borderTopColor: colors.border,
                },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </KeyboardAwareFormContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  inner: { width: "100%", flexGrow: 1 },
  padded: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 44 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
});
