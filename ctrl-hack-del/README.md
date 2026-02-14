This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### API Keys Setup

Create a local env file and add your API keys:

1) Copy the example file:
	- `.env.local.example` → `.env.local`
2) Set the required values:
	```
	GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
	ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY_HERE
	```
3) (Optional) Customize the voice:
	```
	ELEVENLABS_VOICE_ID=YOUR_VOICE_ID_HERE
	```
	If not set, defaults to Rachel (21m00Tcm4TlvDq8ikWAM). Find voice IDs at [ElevenLabs Voice Library](https://elevenlabs.io/voice-library).

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
