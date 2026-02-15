This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### API Keys Setup

Create a `.env.local` file in the project root and add your API keys:

```env
# Required API Keys
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Voice IDs for each character
ELEVENLABS_VOICE_ID=cgSgspJ2msm6clMCkdW9
ELEVENLABS_CHITOSE_VOICE_ID=SOYHLrjzK2X1ezoPC6cr
```

**Where to get API keys:**
- **Gemini API**: Get your key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **ElevenLabs API**: Get your key at [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)
- **Voice IDs**: Browse and clone voices at [ElevenLabs Voice Library](https://elevenlabs.io/app/voice-library)

**Voice Configuration:**
- `ELEVENLABS_VOICE_ID`: Voice for Arisa character (defaults to "21m00Tcm4TlvDq8ikWAM" if not set)
- `ELEVENLABS_CHITOSE_VOICE_ID`: Voice for Chitose character (defaults to "21m00Tcm4TlvDq8ikWAM" if not set)

**Note:** The chatbot will work without ElevenLabs API key, but text-to-speech will be disabled.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
