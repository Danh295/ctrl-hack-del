import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    // Use provided voiceId or default to Rachel (a natural female voice)
    const voice = voiceId || "21m00Tcm4TlvDq8ikWAM";

    const client = new ElevenLabsClient({ apiKey });

    // Generate speech
    const audio = await client.textToSpeech.convert(voice, {
      text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
      },
    });

    // Convert audio stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = audio.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const audioBuffer = Buffer.concat(chunks);

    // Return audio as base64 for easy client-side handling
    return NextResponse.json({
      audio: audioBuffer.toString("base64"),
      contentType: "audio/mpeg",
    });
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return NextResponse.json(
      { error: "Text-to-speech conversion failed" },
      { status: 500 }
    );
  }
}
