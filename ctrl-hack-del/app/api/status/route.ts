import { NextResponse } from "next/server";

// force next.js to never cache this route since it checks API key status on every request
export const dynamic = "force-dynamic";

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  let elevenLabsStatus = { 
    ok: false, 
    remaining: 0, 
    limit: 0, 
    error: "Missing API Key" 
  };
  
  let geminiStatus = { 
    ok: !!geminiKey, 
    error: geminiKey ? null : "Missing API Key" 
  };

  // Check ElevenLabs Quota
  if (elevenLabsKey) {
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": elevenLabsKey }
      });
      
      if (res.ok) {
        const data = await res.json();
        const remaining = data.character_limit - data.character_count;
        elevenLabsStatus = {
          ok: remaining > 0,
          remaining: remaining,
          limit: data.character_limit,
          error: remaining <= 0 ? "Out of characters" : ""
        };
      } else {
        elevenLabsStatus.error = "Invalid API Key";
      }
    } catch (e) {
      elevenLabsStatus.error = "Failed to fetch status";
    }
  }

  return NextResponse.json({ 
    gemini: geminiStatus, 
    elevenLabs: elevenLabsStatus 
  });
}