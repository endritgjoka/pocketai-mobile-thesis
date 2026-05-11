# PocketAI Architecture

## Goal
Build an offline-first mobile AI prototype for empirical evaluation of quantized LLMs and retrieval strategies.

## Layers
UI Layer: React Native screens and reusable components.
State Layer: Zustand stores.
Repository Layer: SQLite access.
Service Layer: LLM, model download, RAG, benchmarking.
Storage Layer: local file system and SQLite.

## Folder Structure
`src/navigation` contains root and tab navigation. `src/components` contains reusable UI, chat, model, and document components. `src/screens` contains feature screens. `src/services` owns runtime logic. `src/repositories` owns SQLite operations. `src/db` owns schema and migrations. `src/store` owns Zustand state.

## Data Flow
User action -> screen -> store/service -> repository -> SQLite/file system -> UI update.

## LLM Runtime
The LlamaService owns all llama.rn interaction. Screens must never call llama.rn directly. It checks local model files, initializes the context once per active model, formats prompts, generates output, and returns benchmark metrics. Repeated generation with the same model reuses the loaded context instead of reloading on every render.

## RAG Pipeline
Document import -> text extraction -> chunking -> local indexing -> retrieval -> prompt construction -> local generation -> benchmark logging.

## Database Repositories
Repositories expose typed methods for settings, models, chats, documents, and benchmarks. This keeps SQL out of screens.

## State Management
Zustand stores hold hydrated settings, model metadata, conversations, and active messages. Durable state remains in SQLite. Screens use narrow selectors for frequently changing state so typing and scrolling remain responsive.

## Chat UX Architecture
The chat screen uses a custom fixed header, a FlatList message stream, and a keyboard-aware ChatComposer. The composer owns text input height and send-button state locally, which keeps typing smooth during generation. Assistant generation is represented with a lightweight typing indicator.

## Error Handling
Async operations catch runtime errors and surface clear messages. Missing model files and inference failures should not crash the app. Model-not-ready states disable generation and point the user to Settings.

## Benchmarking
Every inference run should record enough metadata for thesis analysis: model, task type, prompt estimate, output estimate, generation time, retrieval time, tokens/sec, chunk strategy, topK, selected chunks, and notes when available.

## Testing Approach
Use the README manual checklist first. Then add repository tests, RAG retrieval tests, and device-level llama.rn validation once the native dev build is available. Keyboard behavior must be tested on a physical iPhone and Android device because the composer is a primary UX requirement.

## Future Extensions
Native PDF/DOCX extraction, answer-quality annotations, CSV export, memory telemetry, cancellation support, and richer retrieval algorithms can be added without changing the screen layer heavily.


## Streaming And Conversation Organization

LlamaService serializes model load and generation operations so llama.rn contexts are not called concurrently. Chat screens keep streamed assistant text in component state and persist the final response to SQLite once generation finishes.

Conversation folders are persisted in the folders table. Existing threads data is migrated into folders, and conversations keep folder_id while older thread_id values remain tolerated for compatibility.

Model management is handled through ModelDownloadService, ModelFileService, modelRepository, and settingsRepository. Downloads verify local file existence before marking a model downloaded.

## Local Notifications

NotificationService owns all `expo-notifications` calls. Settings stores local reminder preferences in the existing settings JSON record and syncs schedules only when a user changes a reminder. Notification identifiers use a `pocketai:` prefix so PocketAI reminders can be cancelled without a backend or push service.

## Health And Insights

HealthService abstracts HealthKit on iOS and Health Connect on Android. It handles unsupported devices, simulators, missing native modules, and permission denial without crashing. The Insights screen reads from `useHealthStore`, which calls HealthService and persists snapshots through HealthRepository.

HealthRepository writes latest refresh snapshots to the `health_snapshots` SQLite table. Data remains local on the device and can later be used as optional context for offline LLM experiments.

## Calendar Service

CalendarService wraps `expo-calendar` and owns calendar permission checks, permission requests, calendar discovery, and event reads. Calendar events are persisted through `calendarRepository` in SQLite so the Insights screen can show cached events without blocking on native APIs.

Calendar-triggered local reminders are handled by NotificationService. PocketAI cancels old `pocketai:calendar:` notifications before rescheduling upcoming event reminders, which prevents duplicate meeting notifications. Meeting reminders require both calendar permission and notification permission.

Permission state is re-queried on screen focus for Health, Calendar, and Notifications. Stored permission values are treated as cached UI state only, not as the source of truth.
