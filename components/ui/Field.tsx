import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { NexusText } from "@/components/ui/NexusText";
import { useNexus } from "@/providers/NexusProvider";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, style, ...props }: Props) {
  const { colors } = useNexus();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <NexusText variant="caption" color={error ? colors.danger : colors.textSecondary}>
        {label}
      </NexusText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.primary}
        onFocus={(event) => {
          setFocused(true);
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
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
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
  wrapper: { gap: 7 },
  input: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  multiline: { minHeight: 104, textAlignVertical: "top" },
});
