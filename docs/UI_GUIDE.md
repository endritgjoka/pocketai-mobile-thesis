# PocketAI UI Guide

## Design Goals
PocketAI should feel private, academic, stable, and technically trustworthy. The UI must support thesis testing without feeling like a debug tool. The app now follows a modern mobile AI pattern: calm surfaces, lightweight borders, native-feeling tabs, and a ChatGPT-style conversation screen.

## Color Palette
Primary: #2563EB
Primary Pressed: #1D4ED8
Background: #FFFFFF
App Background Muted: #F8FAFC
Surface: #FFFFFF
Surface Muted: #F1F5F9
Text Primary: #0F172A
Text Secondary: #64748B
Text Muted: #94A3B8
Border: #E2E8F0
Assistant Bubble: #F1F5F9
User Bubble: #2563EB
User Bubble Text: #FFFFFF
Success: #16A34A
Warning: #F59E0B
Error: #DC2626

## Borders and Radius
Cards: 18
Buttons: 16
Inputs: 22
Chat bubbles: 20
Bottom sheets/menus: 24

Use thin borders and avoid heavy shadows. Shadows are reserved for the chat composer and major elevated surfaces.

## Typography
Screen title: 28/700
Header title: 22/700
Section title: 16/700
Card title: 17/600
Body: 15/400
Secondary: 14/400
Caption: 12/400
Button: 15/600

## Layout Principles
Use generous spacing, readable cards, and clear hierarchy. Avoid visual noise. Benchmark data should be easy to scan. Primary workflows must be reachable from the first screen of each tab.

## Screens
Onboarding introduces PocketAI, privacy guarantees, and first model selection. The model download screen uses a focused model card, progress percentage, downloaded bytes, and a clear offline-after-download explanation.

Chats use a custom header, FlatList messages, suggested prompt chips, and a bottom composer that moves above the keyboard. User messages are blue and right-aligned. Assistant messages use a muted bubble and include subtle generation stats.

Documents use clean document rows with file icons, status badges, chunk count, and dates. Document detail shows metadata cards, extraction warnings for non-TXT files, retrieved chunk badges, and a document Q&A composer.

Benchmarks use dashboard stat cards for total runs, average generation time, tokens/sec, retrieval time, and best current model. Recent runs are shown as compact cards with task type, model, timing, and chunk strategy.

Settings use iOS-style grouped sections: AI Model, Inference, Retrieval, Data, and About. Model actions are compact, destructive actions are red, and segmented controls are used for numeric parameters.

## Components
Buttons use primary, secondary, danger, and ghost variants with optional icons. Cards are reserved for meaningful grouped content. Inputs use rounded borders and calm surfaces. Progress bars show large GGUF downloads. Message bubbles separate user and assistant turns. Stat cards display thesis metrics. Status badges communicate model, document, and benchmark states.

## Empty, Error, And Loading States
Empty states must say what data is missing and what the user can do next. Errors should be user-facing and specific. Loading states should appear on async actions including downloads, generation, imports, and benchmarks. Model-not-ready states appear as a banner above the chat list and disable the composer.

## Keyboard Guidance
The chat screen wraps the message list and composer in `KeyboardAvoidingView` on iOS. The composer is fixed at the bottom of the screen, respects safe-area insets, expands up to three lines, and keeps its placeholder vertically readable. Android uses `softwareKeyboardLayoutMode: resize` in Expo config.

## Performance Guidance
Long lists use FlatList. Message rows, conversation rows, document rows, stat cards, and UI primitives are memoized. Streaming token updates should be batched if enabled later; the first polish pass avoids per-token parent re-renders. Large document text should stay in SQLite and only previews should be rendered in normal screen state.

## Dark Mode Guidance
Use #0B0F19 as background, #111827 as surface, #1F2937 as muted surface, #334155 as border, #F8FAFC as primary text, and #CBD5E1 as secondary text. Preserve the same hierarchy and avoid saturated backgrounds.


## Chat And Folder Polish Pass

The chat interface follows a compact ChatGPT-style layout: chevron-only back navigation, centered conversation title, a small model selector pill, streamed assistant text with a subtle cursor, and a rounded composer that stays above the keyboard.

The Chats screen uses folders as collapsible sections. Folder rows use a chevron, folder icon, title, count, and overflow menu. Conversation rows expose rename, move, and delete actions while preserving a clean list layout.

Model cards in Settings use a clear status badge, progress bar during download, and compact actions for Download, Set Active, Info, and Delete.


## Keyboard And Modal Rules

All bottom-sheet modals that contain text inputs must be wrapped in a keyboard-aware container. Rename, folder creation, move, and model selector sheets should remain fully visible when the keyboard is open on iOS and Android. Before accepting UI changes, test: open the sheet, focus the input, confirm the text field and primary action button are above the keyboard, then rotate through cancel/save flows.

## Navigation and Composer QA
- Detail screens should use the native stack back button with no back-title text. Avoid custom chevron buttons unless a screen has a fully custom header requirement.
- Chat and document prompt composers must remain above the keyboard on iOS and Android.
- Chat prompt input grows naturally from one line to three lines, then becomes internally scrollable. Do not allow the composer to cover too much of the message list.
- Rename and action modals must be keyboard-aware so text fields are never hidden by the keyboard.
