import { createContext, type RefObject } from "react";
import type { ScrollView } from "react-native";

export type KeyboardAwareFormContextValue = {
  registerFocusedField: (y: number, height: number) => void;
  scrollRef: RefObject<ScrollView | null>;
};

export const KeyboardAwareFormContext = createContext<KeyboardAwareFormContextValue | null>(null);
