<div align="center">

  <img src="assets/banner.svg" alt="Nexus AI — Personal Mission OS" width="100%" />

  <h1>Nexus AI · Personal Mission OS</h1>

  <p>
    <strong>A personal execution system that turns ambitious goals into one realistic mission for today.</strong>
  </p>

  <p>
    <a href="https://github.com/Guuh-dev/Nexus-AI-v2"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-Nexus--AI--v2-181717?style=for-the-badge&logo=github" /></a>
    <a href="https://github.com/Guuh-dev/Nexus-AI-v2/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Guuh-dev/Nexus-AI-v2/ci.yml?style=for-the-badge&label=CI" /></a>
    <img alt="Expo 57" src="https://img.shields.io/badge/Expo-57-000020?style=for-the-badge&logo=expo" />
    <img alt="React Native" src="https://img.shields.io/badge/React_Native-0.86-20232A?style=for-the-badge&logo=react" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript" />
  </p>

  <p>
    <a href="#the-idea">The idea</a> ·
    <a href="#features">Features</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#android-widget">Android widget</a> ·
    <a href="#contact">Contact</a>
  </p>

</div>

<br />

> **Nexus AI is not a generic to-do list.** It is a local-first personal execution system that understands your goals, routine, available time and progress to create the next realistic step — without turning planning into another form of procrastination.

## The idea

You describe where you want to go, why it matters and what your real life looks like. Nexus turns that context into a daily mission with prioritized tasks, estimated time, XP and a focus message.

The result is a personal command center designed to be opened every day:

```text
Long-term goal
      ↓
Profile + routine + energy + available time
      ↓
Today's main mission
      ↓
Executable tasks + focus + progress + streak
```

## Features

| Area | What Nexus delivers |
| --- | --- |
| Deep onboarding | An eight-stage Brazilian Portuguese diagnosis covering identity, mission, reality, evolution, blockers, learning style and execution. |
| Planning | Structured daily plans validated with Zod, automatic repair and a local fallback. |
| Nexus Brain | Persistent contextual chats with controlled memories, conversation history and proposed actions. |
| Professor Atlas | A subject-specific interview followed by adaptive roadmaps, lessons, practical proof and progress tracking. |
| Today | Main mission, tasks, categories, priorities, estimated time, XP and daily progress. |
| Execution | Complete, undo, edit, postpone and delete tasks without duplicated XP. |
| Focus OS | Sprint, Pomodoro, 50-minute deep work, flow, custom sessions, recovery after closing and local ambient sound. |
| Progression | Levels, attributes, achievements, XP, challenges, Boss Battles, streak and AI-assisted weekly reviews. |
| Operations & habits | Multi-stage operations, milestones, intelligent routines and individual habit streaks. |
| Weekly planning | Seven-day capacity view, overload signals and movable scheduled tasks. |
| Offline | The app remains useful without internet through a deterministic plan based on the saved profile. |
| Privacy | Profile, chats, roadmaps and history stay on the device; no account is required. |
| Personalization | Nine themes, command-center presets, rearrangeable sections, mascot skins, accessories and Professor variants. |
| Backup | JSON export/import with validation and selective recovery of corrupted sections. |
| Notifications | Optional daily Android reminders that do not break the web preview. |
| Widget Studio | Native widgets from 1×1 to 5×2 with per-instance styles, up to five tasks, direct completion, learning status, Nexus + Atlas and privacy controls. |

## Designed to be opened every day

The visual direction is a personal command center: dark, premium, futuristic and minimal, with purple as the action color and restrained feedback.

| Element | Direction |
| --- | --- |
| Background | `#050505` |
| Surfaces | `#111114` and `#19191F` |
| Primary action | `#8B5CF6` |
| Text | `#F7F7F8` and `#A1A1AA` |
| Feedback | Green for progress, yellow for attention and pink for risk |
| Mascot | Original pixel-art Python-inspired mascot with idle, thinking, celebrating, offline and warning states |

## Secure, structured AI

The client never instantiates OpenRouter and never receives the API key. The integration runs through a server-side endpoint using the `OPENROUTER_API_KEY` secret.

The pipeline:

1. Sends only the required, sanitized and size-limited context.
2. Streams the response through `@openrouter/sdk`.
3. Tries `openrouter/free`, which dynamically selects compatible free models.
4. Falls back locally without spending credits; a paid `deepseek/deepseek-v4-flash` contingency is available only when explicitly enabled on the server.
5. Removes Markdown fences, parses the JSON and validates the contract with Zod.
6. Performs one repair attempt when the response is invalid.
7. Uses a safe local plan when AI is unavailable.

The key is never stored in AsyncStorage, `localStorage`, the client bundle, browser responses or logs.

## Architecture

```text
app/                  Expo Router screens, tabs and server-side API routes
components/           Cards, mascot, loading, error, progress and UI primitives
features/             Pure planning, task and statistics logic
providers/            Local-first state and atomic operations
schemas/              Zod contracts for profile, plans and storage
services/             OpenRouter, storage, widget, backup and notifications
modules/nexus-widget/ Isolated Kotlin native module for Android
tests/                Domain, API, rollover and web-safety regression tests
docs/                 Architecture, deployment, testing and widget guides
```

Key decisions:

- Expo Router, React Native Web and TypeScript remain the core stack.
- Storage is versioned and validated before it is consumed.
- The first stable version requires no login or Supabase.
- Native widget code is isolated and never reaches the browser bundle.
- Render failures are contained by Error Boundaries without deleting profile or history.

## Getting started

Requirements: Node.js 20 or 22.

```bash
npm install
cp .env.example .env
# optional: add OPENROUTER_API_KEY to .env for server-side AI planning
npm run web
```

Without a key, the app still opens and uses local planning. On Replit, add the key under **Tools → Secrets**. Never expose this server secret through an Expo public environment variable.

Useful commands:

```bash
npm run typecheck       # TypeScript
npm run lint            # Expo ESLint
npm test                # Vitest suite
npm run security:secrets
npm run export:web      # web/Replit export
npm run verify          # complete verification
```

## Android widget

The real widget is native: it does not run inside Expo Go and cannot be validated in a browser. It is compiled into the APK/AAB and can be added to the home screen after installing the app.

It supports:

- adaptive layouts from 1×1 through 5×2, including 2×2, 4×2 and 4×4;
- today's mission, up to five tasks, progress, streak, XP, level and focus time;
- Nexus, Professor Atlas and optional companions, including Nexus + Atlas together;
- the next roadmap lesson and learning progress when enabled;
- Nexus, AMOLED, transparent, glass, pixel, minimal, gamer and privacy styles;
- direct task completion with idempotent XP synchronization when the app resumes;
- independent configuration for multiple widget instances;
- refreshes when the plan, task, streak or preferences change;
- tap actions for Today and Quick Capture.

Read the complete guide in [docs/ANDROID_WIDGET.md](docs/ANDROID_WIDGET.md).

## Deployment and publishing

The complete Replit, GitHub, EAS, personal APK and future Play Store flow is documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Quick commands:

```bash
# Personal APK / native widget
npx eas-cli@latest build --platform android --profile preview

# Production AAB for Google Play, when the product is ready
npx eas-cli@latest build --platform android --profile production
```

Use the preview APK for personal testing. Google Play requires a production AAB and the required developer-account publishing steps.

## Verification

The project includes GitHub Actions CI that runs TypeScript, lint, tests, secret scanning and the web export on every push or pull request.

The V2.1 test suite covers cases such as:

- invalid AI responses, structured-output incompatibility and repair/fallback;
- missing key, timeout, offline mode and unavailable servers;
- duplicate onboarding submissions;
- idempotent XP when checking and unchecking tasks;
- date rollover without duplicate plans;
- keyboard-safe forms and precise Professor Atlas validation;
- unsafe nested payloads and prototype-related keys;
- widget presets, storage v3 → v4 migration and safe styles for React Native Web;
- Android module isolation from the web build.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Android widget](docs/ANDROID_WIDGET.md)
- [Complete deployment guide](docs/DEPLOYMENT.md)
- [Testing guide](docs/TESTING.md)
- [Changelog](CHANGELOG.md)
- [Privacy policy](PRIVACY.md)
- [Security model](SECURITY.md)

## Roadmap

- [x] Nexus AI v1: daily planning, execution, offline mode, progress and base widget.
- [x] Nexus AI v2: Brain, Professor Atlas, roadmaps, Focus OS, operations, habits, weekly planning, deep personalization and Widget Studio.
- [ ] Optional encrypted multi-device synchronization.
- [ ] Voice capture after native permission and privacy review.
- [ ] Public beta and Google Play testing track.

## About the project

Nexus AI was created by **Gustavo Araújo** as a personal app, portfolio project and product laboratory: a complete React Native/Expo experience with server-side AI, local persistence, web compatibility and native Android code.

## Contact

<div align="center">

  <a href="https://github.com/Guuh-dev"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-Guuh--dev-181717?style=for-the-badge&logo=github" /></a>
  <a href="https://www.linkedin.com/in/gustavo-araujo-542019316"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-Gustavo_Araújo-0A66C2?style=for-the-badge&logo=linkedin" /></a>
  <a href="https://www.upwork.com/freelancers/~0150fe8d8539ae61d9"><img alt="Upwork" src="https://img.shields.io/badge/Upwork-Profile-14A800?style=for-the-badge&logo=upwork" /></a>
  <a href="mailto:gustavobebe720@gmail.com"><img alt="Email" src="https://img.shields.io/badge/Email-gustavobebe720%40gmail.com-EA4335?style=for-the-badge&logo=gmail" /></a>

  <p>Personal portfolio coming soon · Brazil</p>

</div>

<br />

<div align="center">
  <sub>Built with Expo, React Native, TypeScript, Zod and curiosity.</sub>
</div>

## License

Distributed under the [MIT License](LICENSE).
