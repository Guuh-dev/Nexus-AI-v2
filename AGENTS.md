# Nexus AI repository guide

- Preserve Expo, React Native, web and Android compatibility.
- Never put API keys in client code or `EXPO_PUBLIC_*` variables.
- Use React Native primitives; raw DOM must not receive React Native style arrays.
- Validate AI, storage and import data before use.
- Keep Android widget code isolated under `modules/nexus-widget`.
- Run `npm run verify` and `npm run export:web` before shipping.
- Native changes require `npx expo prebuild --platform android --clean` and a new EAS build.
