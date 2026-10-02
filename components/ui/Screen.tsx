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
import { focusedFieldScrollDelta, resolveKeyboardOcclusion } from "@/components/brain/keyboard-occlusion";

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
  const viewportRef = useRef<View | null>(null);
  const baselineHeight = useRef(0);
  const scrollOffset = useRef(0);
  const focusedField = useRef<((callback: (y: number, height: number) => void) => void) | null>(null);
  const keyboardTop = useRef<number | undefined>(undefined);
  const pendingScroll = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const measure = focusedField.current;
    if (!measure) return;
    viewportRef.current?.measureInWindow((_x, viewportTop, _width, height) => {
      measure((fieldTop, fieldHeight) => {
        if (focusedField.current !== measure) return;
        const delta = focusedFieldScrollDelta({ fieldTop, fieldHeight, viewportTop, viewportHeight: height, keyboardTop: keyboardTop.current });
        if (Math.abs(delta) < 1) return;
        scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffset.current + delta), animated: false });
      });
    });
  }, [keyboardAware, scroll]);
  const scheduleFocusedScroll = useCallback(() => {
    if (pendingScroll.current) clearTimeout(pendingScroll.current);
    pendingScroll.current = setTimeout(scrollFocusedField, 80);
  }, [scrollFocusedField]);

  useEffect(() => {
    if (!keyboardAware) return undefined;
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        keyboardTop.current = event.endCoordinates.screenY;
        setKeyboardHeight(Math.max(0, event.endCoordinates.height));
        scheduleFocusedScroll();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => { keyboardTop.current = undefined; setKeyboardHeight(0); },
    );
    return () => {
      show.remove();
      hide.remove();
      if (pendingScroll.current) clearTimeout(pendingScroll.current);
    };
  }, [keyboardAware, scheduleFocusedScroll]);

  useEffect(() => {
    if (keyboardHeight > 0) scheduleFocusedScroll();
  }, [keyboardHeight, keyboardInset, viewportHeight, scheduleFocusedScroll]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setViewportHeight(height);
    if (keyboardHeight === 0) baselineHeight.current = Math.max(baselineHeight.current, height);
  }, [keyboardHeight]);

  const context = useMemo(
    () => ({
      scrollRef,
      registerFocusedField: (measure: (callback: (y: number, height: number) => void) => void) => {
        focusedField.current = measure;
        scheduleFocusedScroll();
      },
    }),
    [scheduleFocusedScroll],
  );

  const innerStyle = useMemo(
    () => [
      styles.inner,
      !scroll && { flex: 1, minHeight: 0 },
      { maxWidth },
      padded && styles.padded,
      contentContainerStyle,
    ],
    [contentContainerStyle, maxWidth, padded, scroll],
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
      // Web emits scroll when focusing an input; on-drag would blur it mid-typing.
      keyboardDismissMode={Platform.OS === "web" ? "none" : Platform.OS === "ios" ? "interactive" : "on-drag"}
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
          <View ref={viewportRef} collapsable={false} style={styles.flex} onLayout={scheduleFocusedScroll}>{body}</View>
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
