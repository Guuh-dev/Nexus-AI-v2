# Nexus AI update workflow

## Stable checkpoint

The first stable version is tagged as:

```text
nexus-v1-stable-before-professor
```

This checkpoint is the rollback target before the v2 storage, Brain, Professor and native widget changes.

## Normal JavaScript update

Use this path for screens, styles, text, prompts, local rules and other changes that do not require native Android code.

1. Create a branch from `main`.
2. Implement the change.
3. Run `npm run verify` and `npm run release:check`.
4. Open a pull request.
5. Merge only after CI passes.
6. Publish through EAS Update after the update channel is configured.

## Native update

Generate a new APK/AAB when changing the widget, Kotlin module, Android permissions, native dependencies, icons, splash screen, deep links or Expo SDK.

The manual **Nexus Android Preview** GitHub workflow can generate a preview APK after the `EXPO_TOKEN` secret is configured.

## One-time automation setup

1. Create a personal access token in Expo with build permission.
2. Add it in GitHub → Settings → Secrets and variables → Actions as `EXPO_TOKEN`.
3. Keep Render connected to the `main` branch with auto-deploy enabled.
4. Keep `OPENROUTER_API_KEY` only in Render Environment.
5. Run **Nexus Android Preview** manually whenever a change touches native code.

After that, a normal update is: request the change, review the pull request, merge it after green CI, let Render update the web/backend automatically, and trigger the Android workflow only when the change classification says a new APK is required.

## Release checklist

- [ ] Tests and lint pass.
- [ ] No secrets appear in the diff or bundle.
- [ ] Offline mode still works.
- [ ] Android and web behavior were checked.
- [ ] Storage migrations are backward-compatible.
- [ ] The change is classified as JavaScript-only or native.
- [ ] Changelog and version are updated when appropriate.
- [ ] A rollback path exists.
