import { useContext, useRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";
import { KeyboardAwareFormContext } from "@/components/ui/KeyboardAwareContext";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, style, ...props }: Props) {
  const { colors, visuals } = useNexus();
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<View>(null);
  const keyboardAware = useContext(KeyboardAwareFormContext);
  return (
    <View ref={wrapperRef} collapsable={false} style={styles.wrapper}>
      <NexusText variant="caption" color={error ? colors.danger : focused ? colors.primarySoft : colors.textSecondary}>
        {label}
      </NexusText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        onFocus={(event) => {
          setFocused(true);
          keyboardAware?.registerFocusedField((callback) => {
            wrapperRef.current?.measureInWindow((_x, y, _width, height) => callback(y, height));
          });
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            borderRadius: Math.max(8, visuals.buttonRadius),
          },
          props.multiline && styles.multiline,
          style,
        ]}
      />
      {error || hint ? (
        <NexusText variant="caption" color={error ? colors.danger : colors.textSecondary}>
          {error ?? hint}
        </NexusText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    lineHeight: 21,
  },
  multiline: { minHeight: 92, textAlignVertical: "top" },
});
