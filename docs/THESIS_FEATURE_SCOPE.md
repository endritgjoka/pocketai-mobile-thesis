# PocketAI Thesis Feature Scope

## Included Features
- Onboarding
- GGUF model download manager
- Local model loading through `llama.rn`
- Offline chat
- Conversation persistence
- TXT document import
- Local chunking
- Keyword cosine retrieval
- Document Q&A
- Benchmark dashboard
- Settings and model switcher
- Local-only notifications for manually configured reminders
- Basic local fitness context collection through HealthKit / Health Connect

## Deferred Features
- Calendar
- Voice
- Whisper
- Full notes system
- AI-generated health recommendations
- Background AI generation
- Cloud sync
- Login/account system

## Why Features Are Deferred
Calendar, voice, Whisper, cloud sync, and account features do not directly support the primary empirical evaluation of quantization and retrieval. AI-generated health recommendations are deferred because this pass only collects local health context and does not inject it into prompts yet.

## Research Variables
- Model family and quantization
- Context size
- Temperature and top-p
- Prompt length
- Output length
- Chunk size
- Top K
- Retrieval time
- Generation time
- Tokens per second
- Optional local context availability from fitness data
- Reminder adherence for repeated benchmark collection

## Suggested Experiments
- Compare Phi-3 Mini Q4 and Llama 3.2 3B Q4 on the same chat prompt.
- Compare 256, 512, and 1024 token chunking for the same document question.
- Measure model load time after cold start.
- Record answer-quality notes for retrieved-context adequacy.
- Compare performance on devices with different RAM classes.
- Use local benchmark reminders to collect repeated inference runs over time.
- Later, evaluate whether local health context changes offline prompt usefulness without cloud services.

## Calendar and Local Reminders

Included in this version:
- Local calendar permission handling
- Local calendar event reading
- Today's events in Insights
- Local meeting reminder notifications before upcoming events

Calendar events are included only as local context and a local reminder source. AI-generated calendar summaries, meeting preparation, cloud calendar sync, and calendar-backed planning agents are deferred because they are not required for the primary empirical evaluation of mobile LLM inference and retrieval.
