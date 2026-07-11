/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    OPENROUTER_API_KEY?: string;
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_APP_ENV?: "development" | "preview" | "production";
  }
}
