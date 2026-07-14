import { useContext, useRef, useState } from "react";
import { StyleSheet, TextInput, View, type LayoutChangeEvent, type TextInputProps } from "react-native";
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
  const [layout, setLayout] = useState({ y: 0, height: 0 });
  const wrapperRef = useRef<View>(null);
  const keyboardAware = useContext(KeyboardAwareFormContext);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = { y: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height };
    setLayout(next);
    props.onLayout?.(event);
  };
  return (
    <View ref={wrapperRef} style={styles.wrapper} onLayout={onLayout}>
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
          const registerFocusedField = keyboardAware?.registerFocusedField;
          const contentNode = keyboardAware?.scrollRef.current?.getInnerViewNode();
          if (wrapperRef.current && contentNode && registerFocusedField) {
            wrapperRef.current.measureLayout(
              contentNode,
              (_x, y, _width, height) =>
                registerFocusedField(y, height),
              () => registerFocusedField(layout.y, layout.height),
            );
          } else {
            registerFocusedField?.(layout.y, layout.height);
          }
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
            borderRadius: Math.max(8, visuals.buttonRadius - 1),
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
