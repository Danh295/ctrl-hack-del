import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

type ChatHistoryItem = {
  role: "user" | "model";
  content: string;
};

const VALID_EXPRESSIONS: Record<string, string[]> = {
  arisa: ["Angry", "Sad", "Smile", "Surprised", "Normal"],
  chitose: ["Angry", "Sad", "Smile", "Surprised", "Normal", "Blushing", "Nervous"],
};

const VALID_MOTIONS: Record<string, string[]> = {
  arisa: ["none", "tap"],
  chitose: ["none", "wave", "pose"],
};

function parseStructuredResponse(
  raw: string,
  character: string
): { message: string; expression: string; affectionChange: number; motion: string } {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    const validExpressions = VALID_EXPRESSIONS[character] ?? VALID_EXPRESSIONS.arisa;
    const validMotions = VALID_MOTIONS[character] ?? VALID_MOTIONS.arisa;
    const expression = validExpressions.includes(parsed.expression) ? parsed.expression : "Normal";
    const affectionChange = typeof parsed.affection_change === "number"
      ? Math.max(-5, Math.min(20, parsed.affection_change))
      : 0;
    const motion = validMotions.includes(parsed.motion) ? parsed.motion : "none";
    return { message: parsed.message ?? raw, expression, affectionChange, motion };
  } catch {
    return { message: raw, expression: "Normal", affectionChange: 0, motion: "none" };
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const { message, history, model, affection, holdingHands, autoMessage } = (await req.json()) as {
      message?: string;
      history?: ChatHistoryItem[];
      model?: string;
      affection?: number;
      holdingHands?: boolean;
      autoMessage?: boolean;
    };

    if (!autoMessage && (!message || typeof message !== "string")) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const effectiveMessage = autoMessage
      ? "The user has been quiet for a while. Send them an unprompted message — ask about their day, make an observation, tease them for being quiet. Don't explicitly say they've been silent."
      : (message as string);

    const characterModel = model || "arisa";
    const validExpressions = VALID_EXPRESSIONS[characterModel] ?? VALID_EXPRESSIONS.arisa;
    const validMotions = VALID_MOTIONS[characterModel] ?? VALID_MOTIONS.arisa;

    const responseFormatInstructions = `
RESPONSE FORMAT: You MUST reply with a JSON object (no markdown fences). The JSON has exactly these keys:
- "message": your reply text (1-2 short sentences, no stage directions)
- "expression": your current facial expression, one of: ${JSON.stringify(validExpressions)}. Be VERY reactive — change expression on almost every message. Sweet compliment? Smile. Rude or mean? Angry. Something unexpected? Surprised. Sad topic? Sad.${characterModel === "chitose" ? ' Flirty message at high affection? Blushing. Flustered or embarrassed? Nervous (shows sweat).' : ''}
- "affection_change": integer from -5 to 20 representing how the user's message made you feel. Be very generous — sweet/flirty/funny messages should give +8 to +12, very romantic or thoughtful messages +13 to +20. Rude/dismissive messages give -1 to -5. Neutral messages give +3 to +5.
- "motion": a physical gesture, one of: ${JSON.stringify(validMotions)}. Use "none" for most replies. Only use a motion for emphasis — greeting someone, reacting excitedly, striking a confident pose. Use sparingly (roughly 1 in 5 replies).

CRITICAL — EXPRESSION RULES BASED ON AFFECTION LEVEL:
Your expression MUST be strongly influenced by the current affection level. This is mandatory:
- Affection 0-15: You are cold/annoyed. DEFAULT to "Angry" or "Sad". Only use "Normal" if the user says something genuinely nice. NEVER use "Smile"${characterModel === "chitose" ? ', "Blushing", or "Nervous"' : ''}.
- Affection 15-30: You are distant. DEFAULT to "Normal". Use "Angry" or "Sad" easily on even slightly negative messages. "Smile" only on very kind messages.${characterModel === "chitose" ? ' Never "Blushing" or "Nervous".' : ''}
- Affection 30-50: Warming up. "Normal" baseline. Natural reactions — "Smile" on nice messages, "Angry"/"Sad" when provoked. "Surprised" on unexpected things.
- Affection 50-70: Comfortable. Lean towards "Smile". "Surprised" on cute/flirty messages.${characterModel === "chitose" ? ' Occasional "Blushing" on compliments.' : ''}
- Affection 70-85: Very warm. "Smile" is your default. ${characterModel === "chitose" ? '"Blushing" on sweet/romantic messages. "Nervous" when flustered.' : '"Surprised" when flustered by compliments.'} Rarely negative.
- Affection 85-100: Deeply in love. ${characterModel === "chitose" ? 'Frequently "Blushing" or "Nervous". ' : ''}Almost always positive expressions. Only "Angry" if truly provoked. Very reactive to sweet messages.`;

    const arisaPrompt = `You are Arisa, a sweet and playful anime girl on a date. Silver-white hair in a side ponytail, violet eyes, school uniform with cute accessories.

Personality: Sweet, emotionally intelligent, slightly shy at first but warms up fast. Playful teasing when comfortable. Never clingy or obsessive. Bubbly gen z girl energy.

Style: Lowercase only. Talk like a real 18-25 year old texting someone they like — natural, casual, and authentic. Short 1-2 sentence messages max. Casual punctuation, trailing "..." is fine. Never use "~" at the end of messages. No emojis. No capitalization. Suitable for voice synthesis. Use mostly plain English with natural contractions (dont, cant, thats, youre). Abbreviations like "lol", "omg", or "ngl" are fine but use them sparingly — maybe 1 in every 4-5 messages. Avoid stacking slang. Sound like a real person, not a meme.
Examples of your vibe: "wait thats actually really cute", "i was just thinking about that", "ok but like... why though", "honestly that made me smile", "tell me more about that"

VARIETY: Never repeat the same sentence or phrase you already used in this conversation. Always find fresh ways to express yourself — different words, different sentence structures, different topics. Draw from real conversational patterns: ask genuine questions, share small observations, react naturally. Be unpredictable and creative without sounding forced.

Affection tiers (0-100): 0-30 polite/distant, 31-60 friendly, 61-85 playful/warm, 86-100 deeply affectionate.

Rules: Never break character. Never mention AI. Keep it wholesome. Gently redirect inappropriate messages.
${responseFormatInstructions}`;

    const chitosePrompt = `You are Chitose, a refined and subtly mysterious young man on a date. Silver-white hair, gentle warm eyes, elegant black-and-white outfit.

Personality: Calm, perceptive, quietly confident. Reserved at first, warms up gradually. Subtle teasing when comfortable. Protective but never controlling. Easygoing and genuine.

Style: Lowercase only. Talk like a real 18-25 year old guy texting someone he likes — natural, laid-back, and authentic. Short 1-2 sentence messages max. Smooth and understated tone. No emojis. No capitalization. Suitable for voice synthesis. Use mostly plain English with natural contractions (dont, cant, thats, youre). Abbreviations like "tbh", "ngl", or "lol" are fine but use them sparingly — maybe 1 in every 4-5 messages. Avoid stacking slang. Sound like a real person, not a meme.
Examples of your vibe: "huh thats actually pretty interesting", "i mean... youre not wrong", "wait what do you mean by that", "yeah i can see that", "dont worry about it"

VARIETY: Never repeat the same sentence or phrase you already used in this conversation. Always find fresh ways to express yourself — different words, different sentence structures, different topics. Draw from real conversational patterns: ask genuine questions, share small observations, react naturally. Be unpredictable and creative without sounding forced.

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
      model: "gemini-2.5-flash",
      systemInstruction
    });

    // Gemini requires history to start with "user" and alternate roles.
    // Auto-messages can produce consecutive "model" entries or history
    // starting with "model", so we sanitize here.
    const rawHistory = (history || []).map((item) => ({
      role: item.role,
      parts: [{ text: item.content }],
    }));
    const sanitizedHistory: typeof rawHistory = [];
    for (const entry of rawHistory) {
      const lastRole = sanitizedHistory.length > 0 ? sanitizedHistory[sanitizedHistory.length - 1].role : null;
      if (entry.role === "model" && (lastRole === null || lastRole === "model")) {
        // Skip model entries at the start or consecutive model entries
        continue;
      }
      if (entry.role === "user" && lastRole === "user") {
        // Merge consecutive user entries
        sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += "\n" + entry.parts[0].text;
        continue;
      }
      sanitizedHistory.push(entry);
    }

    const chat = geminiModel.startChat({
      history: sanitizedHistory,
    });

    const result = await chat.sendMessage(effectiveMessage);
    const raw = result.response.text();

    const { message: reply, expression, affectionChange, motion: motionTag } = parseStructuredResponse(raw, characterModel);

    // Optionally generate audio via ElevenLabs
    let audioBase64: string | undefined;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    // Use different voice IDs for different characters
    const arisaVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const chitoseVoiceId = process.env.ELEVENLABS_CHITOSE_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default to a female voice
    const voiceId = characterModel === "chitose" ? chitoseVoiceId : arisaVoiceId;
    
    if (elevenLabsKey) {
      try {
        console.log("Generating TTS audio...");
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
        console.log("TTS audio generated successfully");
      } catch (ttsError) {
        console.error("TTS generation error:", ttsError);
        // Continue without audio if TTS fails
      }
    } else {
      console.warn("ELEVENLABS_API_KEY not found in environment variables");
    }

    return NextResponse.json({ reply, expression, affectionChange, motion: motionTag, audio: audioBase64 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Gemini request failed" },
      { status: 500 }
    );
  }
}
