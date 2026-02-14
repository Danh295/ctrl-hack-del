# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Architecture

This is a **Next.js 16 (App Router)** Valentine's Day AI companion chatbot with Live2D animated characters. TypeScript, React 19, Tailwind CSS v4.

### Key Pages & Routes

- **`app/page.tsx`** — Landing page with character selection (Arisa, Asuka, Surprise Me). Detects time-of-day for themed greetings. Navigates to `/chat?model={name}`.
- **`app/chat/page.tsx`** — Main chat interface. Split layout: 65% Live2D character model, 35% chat panel. Manages affection meter (0–100), emotion-based expressions, voice input/output, and a cafe date unlock at 50+ affection.
- **`app/about/page.tsx`** — About page.

### API Routes

- **`app/api/chat/route.ts`** — Core backend. Sends conversation to Google Gemini Flash with character-specific system prompts. Parses structured JSON responses containing `message`, `expression` (Angry/Sad/Surprised/Smile/Normal), and `affection_change`. Optionally calls ElevenLabs TTS and returns audio as base64.
- **`app/api/tts/route.ts`** — Standalone ElevenLabs text-to-speech endpoint.
- **`app/api/stt/route.ts`** — ElevenLabs speech-to-text endpoint for voice input.

### Components

- **`components/ModelCanvas.tsx`** — Renders Live2D Cubism models via PIXI.js (`pixi-live2d-display`). Handles expression switching, mouse-tracking parallax, and model loading. Character models live in `public/models/`.

### Environment Variables (`.env.local`)

- `GEMINI_API_KEY` — Google Generative AI
- `ELEVENLABS_API_KEY` — ElevenLabs TTS/STT
- `ELEVENLABS_VOICE_ID` / `ELEVENLABS_ASUKA_VOICE_ID` — Voice IDs (have defaults in code)

### Key Libraries

- `@google/generative-ai` — Gemini API client
- `@elevenlabs/elevenlabs-js` — Voice synthesis/transcription
- `pixi.js` (v6) + `pixi-live2d-display` — Live2D character rendering
- `framer-motion` — Page/element animations

### Type Declarations

`types.d.ts` declares global types for PIXI and Live2D libraries that lack native TypeScript definitions.

### Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).
