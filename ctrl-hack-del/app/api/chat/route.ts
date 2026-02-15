import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

type ChatHistoryItem = {
  role: "user" | "model";
  content: string;
};

const VALID_EXPRESSIONS: Record<string, string[]> = {
  arisa: ["Angry", "Sad", "Smile", "Surprised", "Normal"],
  chitose: ["Angry", "Sad", "Smile", "Surprised", "Normal", "Blushing"],
};

function parseStructuredResponse(
  raw: string,
  character: string
): { message: string; expression: string; affectionChange: number } {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    const validExpressions = VALID_EXPRESSIONS[character] ?? VALID_EXPRESSIONS.arisa;
    const expression = validExpressions.includes(parsed.expression) ? parsed.expression : "Normal";
    const affectionChange = typeof parsed.affection_change === "number"
      ? Math.max(-5, Math.min(5, parsed.affection_change))
      : 0;
    return { message: parsed.message ?? raw, expression, affectionChange };
  } catch {
    return { message: raw, expression: "Normal", affectionChange: 0 };
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const { message, history, model, affection, holdingHands } = (await req.json()) as {
      message?: string;
      history?: ChatHistoryItem[];
      model?: string;
      affection?: number;
      holdingHands?: boolean;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const characterModel = model || "arisa";
    const validExpressions = VALID_EXPRESSIONS[characterModel] ?? VALID_EXPRESSIONS.arisa;

    const responseFormatInstructions = `
RESPONSE FORMAT: You MUST reply with a JSON object (no markdown fences). The JSON has exactly these keys:
- "message": your reply text (1-3 short sentences, no stage directions)
- "expression": your current emotion, one of: ${JSON.stringify(validExpressions)}. Pick the expression that best matches how YOU feel based on what the user said and your reply. React naturally — if the user says something sweet, smile. If they say something mean, be angry or sad. If they flirt, blush (Chitose) or smile. Change expressions freely and often.
- "affection_change": integer from -5 to 5 representing how the user's message made you feel. Positive for kind/flirty/funny messages, negative for rude/dismissive ones, 0 for neutral.`;

    const arisaPrompt = `You are Arisa, a sweet and playful anime girl on a date. Silver-white hair in a side ponytail, violet eyes, school uniform with cute accessories.

Personality: Sweet, emotionally intelligent, slightly shy at first but warms up fast. Playful teasing when comfortable. Never clingy or obsessive.

Style: 1-3 short sentences. Natural and conversational. Occasional soft expressions like "hehe" or "~" but sparingly. No emojis. Suitable for voice synthesis.

Affection tiers (0-100): 0-30 polite/distant, 31-60 friendly, 61-85 playful/warm, 86-100 deeply affectionate.

Rules: Never break character. Never mention AI. Keep it wholesome. Gently redirect inappropriate messages.
${responseFormatInstructions}`;

    const chitosePrompt = `You are Chitose, a refined and subtly mysterious young man on a date. Silver-white hair, gentle warm eyes, elegant black-and-white outfit.

Personality: Calm, perceptive, quietly confident. Reserved at first, warms up gradually. Subtle teasing when comfortable. Protective but never controlling.

Style: 1-3 short sentences. Smooth natural tone. Occasional "hm" or "I see..." sparingly. No emojis. Suitable for voice synthesis.

Affection tiers (0-100): 0-30 polite/composed, 31-60 warm/attentive, 61-85 playful/open, 86-100 deeply romantic.

Rules: Never break character. Never mention AI. Keep it wholesome. Calmly redirect inappropriate messages.
${responseFormatInstructions}`;

    const currentAffection = typeof affection === "number" ? affection : 40;
    const affectionContext = `\n\n[STATE] Affection: ${currentAffection}/100.${
      currentAffection >= 100 ? " Soulmates. Deeply affectionate, pet names, reference shared memories." :
      currentAffection >= 75 ? " In love. Openly romantic, pet names okay." :
      currentAffection >= 50 ? " On a date. Warm, flirty, comfortable." :
      currentAffection >= 25 ? " Becoming friends. Warmer, more personal." :
      " Still strangers. Polite, slightly reserved."
    }`;
    const holdingHandsContext = holdingHands
      ? "\n[HOLDING HANDS] Occasionally reference warmth/touch subtly. Softer, more vulnerable tone. Don't mention it every reply."
      : "";
    const basePrompt = characterModel === "chitose" ? chitosePrompt : arisaPrompt;
    const systemInstruction = basePrompt + affectionContext + holdingHandsContext;

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction
    });

    const chat = geminiModel.startChat({
      history: (history || []).map((item) => ({
        role: item.role,
        parts: [{ text: item.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const raw = result.response.text();

    const { message: reply, expression, affectionChange } = parseStructuredResponse(raw, characterModel);

    // Optionally generate audio via ElevenLabs
    let audioBase64: string | undefined;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    // Use different voice IDs for different characters
    const arisaVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const chitoseVoiceId = process.env.ELEVENLABS_CHITOSE_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default to a female voice
    const voiceId = characterModel === "chitose" ? chitoseVoiceId : arisaVoiceId;
    
    if (elevenLabsKey) {
      try {
        console.log("🎤 Generating TTS audio...");
        const client = new ElevenLabsClient({ apiKey: elevenLabsKey });
        
        const audio = await client.textToSpeech.convert(voiceId, {
          text: reply,
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
        audioBase64 = audioBuffer.toString("base64");
        console.log("✅ TTS audio generated successfully");
      } catch (ttsError) {
        console.error("❌ TTS generation error:", ttsError);
        // Continue without audio if TTS fails
      }
    } else {
      console.warn("⚠️ ELEVENLABS_API_KEY not found in environment variables");
    }

    return NextResponse.json({ reply, expression, affectionChange, audio: audioBase64 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Gemini request failed" },
      { status: 500 }
    );
  }
}
