# Nexus AI v2.4.0 Release Candidate

## Scope

This release candidate addresses systemic Mission OS issues reported on Android:

- global keyboard visibility for forms and multiline inputs;
- synthesis of long user goals into short missions, tasks and widget text;
- roadmap generation that respects level, intent and monetization context;
- evidence-based weekly review with deterministic metrics;
- Android widget payloads with useful empty states and native parity constraints.

## Native impact

This release changes the Android widget provider under `modules/nexus-widget`, so it requires a new native Android build/APK. Do not ship these changes as OTA only.

## Data and migrations

No persisted schema fields were changed. Existing AsyncStorage payloads continue to be read. Widget empty-state handling was added for missing `activePlan` data instead of changing the payload schema.

## Manual QA checklist: Android físico / One UI

1. Open Professor Atlas intake, select advanced level, focus the multiline skills field and verify the keyboard does not cover it.
2. Test a short form, long form, modal form and multiline input with gesture navigation and three-button navigation.
3. Generate a roadmap for an advanced user who already builds Landing Pages, SaaS, Micro-SaaS and apps with AI; verify it starts with offer/prospecting/delivery work instead of beginner templates.
4. Generate a weekly review with no activity; verify it says data is insufficient and does not invent fear, perfectionism or routine patterns.
5. Generate a plan from a long freelance goal; verify the mission title is short and tasks expose first step/result without expanding.
6. Save Widget Studio presets for Mission/Command/Companion families; verify Android widgets refresh and do not show empty black cards.
7. Remove and re-add old widget instances if launcher cache keeps an old provider layout.
