import { createContext, type RefObject } from "react";
import type { ScrollView } from "react-native";

export type KeyboardAwareFormContextValue = {
  registerFocusedField: (measure: (callback: (y: number, height: number) => void) => void) => void;
  scrollRef: RefObject<ScrollView | null>;
};

export const KeyboardAwareFormContext = createContext<KeyboardAwareFormContextValue | null>(null);
