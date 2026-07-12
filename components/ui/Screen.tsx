import {
  useEffect,
  useMemo,
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
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNexus } from "@/providers/NexusProvider";

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!keyboardAware) return undefined;
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardAware]);

  const innerStyle = useMemo(
    () => [
      styles.inner,
      { maxWidth },
      padded && styles.padded,
      keyboardVisible && styles.keyboardOpen,
      contentContainerStyle,
    ],
    [contentContainerStyle, keyboardVisible, maxWidth, padded],
  );

  const content = <View style={innerStyle}>{children}</View>;
  const body = scroll ? (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      contentInsetAdjustmentBehavior="automatic"
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
    >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  inner: { width: "100%", flexGrow: 1 },
  padded: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 44 },
  keyboardOpen: { paddingBottom: 140 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
});
