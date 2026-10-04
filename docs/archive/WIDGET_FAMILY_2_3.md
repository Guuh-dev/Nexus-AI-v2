# Nexus Widget Family 2.3

The Android widget is exposed as five intentionally different picker entries instead of shrinking one dense layout into every launcher cell:

| Entry | Target | Responsibility |
| --- | --- | --- |
| Mini | 1×1 | mascot and streak |
| Strip | 2×1, horizontally resizable to 4×1 | mission/status at a glance |
| Companion | 2×2 | large mascot, mood and contextual line |
| Mission | 4×2 | mission, up to three interactive tasks and progress |
| Command | 4×4 | complete multi-page command center |

All entries read the same validated compact payload. Instance-only choices are stored under `instance_<appWidgetId>`, so two widgets can keep different mascots, moods, content and tap actions.

## Backgrounds

- **Transparent** uses a real `#00000000` native shape.
- **Frosted / Glass** uses the translucent surface drawable.
- **Card** uses the selected solid style drawable.

Launcher padding and wallpaper contrast remain controlled by the device launcher, so the configuration preview should not claim real background blur.

## Companion motion

RemoteViews does not run a continuous animation loop. The provider chooses a deterministic pose when data, size or user interaction changes and moves the mascot only inside `nexus_widget_mascot_stage`. Completion produces a celebrating state; quiet/silent instances rest; other states alternate position. There is no overlay permission, foreground service or periodic frame worker.

## Native release

Provider classes, Manifest receivers, layouts and picker metadata are native changes. They require a new Android build. Existing widgets should be removed and added again after installation so One UI refreshes its cached provider metadata.
