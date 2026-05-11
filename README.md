# PocketAI

PocketAI is an offline-first React Native + Expo Dev Build prototype for the master thesis:

“Empirical evaluation of quantization and information retrieval algorithms for deploying large language models on mobile devices”

The app downloads quantized GGUF models, runs local LLM inference through `llama.rn`, supports offline chat, imports TXT documents, performs simple local RAG, and records benchmark data for thesis analysis.

## Requirements

- Node.js and npm
- Expo Dev Build tooling
- Android Studio or Xcode for native builds
- A hosted GGUF model URL for each configured model

This app does not work in Expo Go because it uses native modules for local LLM inference.

## Installation

```sh
npm install
npx expo prebuild
```

## Model Hosting Setup

Model files are not bundled in Git, APK, or IPA. Update `src/config/models.ts` with real GGUF download URLs:

```ts
url: "https://your-server.example/models/phi3-mini-q4.gguf"
```

## Running The App

```sh
npm run ios
npm run android
```

Use `npm start` only with a previously installed Expo Dev Client.

## Known Limitations

- PDF and DOCX extraction are placeholders in this first prototype.
- `llama.rn` native runtime must be verified on a real dev build device.
- Mock inference exists for UI testing and is disabled by default.
- Retrieval uses keyword cosine similarity without an embedding model.

## Manual Test Checklist

1. Launch app
2. Complete onboarding
3. Download model
4. Start chat
5. Ask test prompt
6. Import TXT document
7. Ask document question
8. Open benchmark screen
9. Switch model
10. Clear data

## Development Roadmap

- Validate `llama.rn` completion API on Android and iOS dev builds
- Add native PDF/DOCX text extraction
- Add CSV export for benchmark runs
- Add answer-quality notes per run
- Add memory approximation per device/runtime where feasible

## UI and Performance Polish Pass

The main app UI has been refactored toward a modern mobile AI experience. The bottom tabs now use clean native icons, each main tab has a custom polished header, and the chat conversation screen uses a ChatGPT-style layout with a fixed header, FlatList message stream, suggested prompts, generation stats, and a keyboard-aware composer.

Keyboard handling is centered on `KeyboardAvoidingView` for iOS and `softwareKeyboardLayoutMode: resize` for Android. The chat composer respects safe-area insets, expands up to 120px, and stays above the keyboard.

Performance changes include memoized rows/components, FlatList rendering for long lists, narrower Zustand selectors on hot screens, and avoiding per-token UI updates unless streaming is later batched.


## Streaming, Folders, and Model Management

PocketAI now supports progressive assistant rendering in chat. Native llama.rn token callbacks are used when available; if a runtime returns the final text only, the UI falls back to visual streaming so responses still appear progressively. Final assistant messages and benchmark metrics are written to SQLite only once generation completes.

Chats can be organized into folders from the Chats screen. Conversations can be renamed, moved between folders and Ungrouped, or deleted with confirmation. New chats are titled locally from the first user message, without cloud calls or model use.

Settings includes model management cards for every configured GGUF model. Users can download, retry, set active, view info, and delete local model files. The conversation header also includes a model selector so downloaded models can be switched directly from chat.

Known limitations:
- Real local GGUF inference is not instant; first response includes model load time.
- Stop generation cancels visual streaming immediately, but native llama.rn cancellation depends on runtime support.
- PDF/DOCX extraction remains a placeholder; TXT is the reliable document format for thesis RAG tests.


### Keyboard QA Note

Bottom sheets with inputs, including folder creation and conversation rename, must stay above the keyboard. If a sheet is covered, check the shared AppModal keyboard avoidance before patching individual screens.

## Local Notifications

PocketAI supports local-only reminders using `expo-notifications` in an Expo Dev Build. No push notifications, Firebase, backend, account, or analytics service is used.

Settings includes a Notifications section where you can request permission, view permission status, schedule a test notification after about 5 seconds, enable fixed-time reminders for morning briefing, document review, and benchmark runs, and cancel PocketAI reminders.

Default reminder times:
- Morning briefing: 07:30
- Document review: 18:00
- Benchmark reminder: 20:00

## Fitness / Health Integration

The Insights tab reads basic fitness data locally when permission is granted. iOS uses HealthKit through `react-native-health`; Android uses Health Connect through `react-native-health-connect`.

This requires an Expo Dev Build or native build. It does not work in Expo Go. Simulators may report fitness support as unavailable.

Native permission notes:
- iOS includes HealthKit usage descriptions for local read access.
- Android includes Health Connect read permissions for steps, sleep, and heart rate.
- PocketAI does not upload health data or send it to a backend.

Manual test additions:
1. Open Settings and request notification permission.
2. Tap Test Notification and wait about 5 seconds.
3. Enable and disable each local reminder toggle.
4. Open Insights.
5. Request fitness permission on a real device.
6. Refresh fitness data and confirm unsupported/denied/no-data states are graceful.

## Permission State and Calendar Integration

PocketAI now re-checks native permission state when Insights and Settings regain focus. Fitness, notification, and calendar controls follow the same rules: request buttons appear only before a decision, granted permissions show connected controls, and denied/restricted permissions show an Open Settings action.

Calendar integration uses `expo-calendar` in the Expo Dev Build. Calendar events are read locally, stored in SQLite, and shown on the Insights screen. Calendar data is not uploaded, synced, or sent to a backend.

Local meeting reminders use `expo-notifications`. When both Calendar and Notification permissions are granted, PocketAI can schedule local reminders for upcoming non-all-day events. The default reminder is 30 minutes before the event, with 10/15/30/60 minute options in Settings. If a permission is denied, re-enable it from iOS/Android system settings.
