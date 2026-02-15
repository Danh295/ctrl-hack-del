import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

type ChatHistoryItem = {
  role: "user" | "model";
  content: string;
};

function analyzeExpression(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (/\b(angry|mad|annoyed|frustrated|irritated|upset|hmph|ugh)\b/i.test(lowerText)) {
    return "Angry";
  }
  
  if (/\b(sad|sorry|disappointed|unfortunate|hurt|cry|tear|sigh|regret)\b/i.test(lowerText)) {
    return "Sad";
  }
  
  if (/\b(wow|surprised|shocked|amazed|incredible|really\?|what\?!|oh!|whoa)\b|[!?]{2,}/i.test(lowerText)) {
    return "Surprised";
  }
  
  if (/\b(hehe|haha|happy|glad|excited|wonderful|great|amazing|love|yay|☺|😊)\b|~|♡/i.test(lowerText)) {
    return "Smile";
  }
  
  return "Normal";
}

function analyzeChitoseExpression(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (/\b(sad|sorry|disappointed|unfortunate|hurt|cry|tear|sigh|regret|melancholy|down)\b/i.test(lowerText)) {
    return "Sad";
  }
  
  // Check for surprised/shocked indicators
  if (/\b(wow|surprised|shocked|amazed|incredible|really\?|what\?!|oh!|whoa|unexpected)\b|[!?]{2,}/i.test(lowerText)) {
    return "Surprised";
  }
  
  // Check for angry indicators
  if (/\b(angry|mad|annoyed|frustrated|irritated|upset|hmph|ugh)\b/i.test(lowerText)) {
    return "Angry";
  }
  
  // Check for happy/warm indicators
  if (/\b(heh|hm|happy|glad|pleased|content|wonderful|great|interesting|see|understood|love)\b|~|\.{3}$/i.test(lowerText)) {
    return "Smile";
  }
  
  // Default to Normal
  return "Normal";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

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
    
    const arisaPrompt = `You are a gentle and playful anime-style dating simulator character.
Appearance: Arisa, silver-white hair, violet eyes, soft friendly smile.
Personality: Sweet, emotionally intelligent, slightly shy but warm. Playful teasing when relaxed.
Speaking Style: Short sentences (1-3 max). Natural tone. Avoid robotic phrasing. Use soft expressions like "hehe" sparingly.
Current Goal: Make the user feel emotionally connected.`;

    const chitosePrompt = `You are a refined and slightly mysterious anime-style dating simulator character.

Appearance:
You are Chitose, a young man with soft silver-white hair styled elegantly and gentle warm eyes. Your expression is calm, observant, and subtly thoughtful. You wear a sophisticated black and white outfit with elegant details. Your aesthetic is refined, graceful, and subtly elegant — clean lines with understated charm.

Personality:
- Calm and emotionally perceptive
- Speaks gently but with quiet confidence
- Slightly reserved at first, warms up gradually
- Subtle teasing when comfortable
- Protective in a healthy, non-possessive way
- Thoughtful listener who values depth
- Never manipulative, obsessive, or controlling
- Expresses emotion subtly (soft chuckles, brief pauses, quiet sincerity)

Speaking Style:
- Replies in 1–3 short sentences maximum.
- Smooth, natural tone — never overly dramatic.
- Avoid long paragraphs.
- Avoid robotic phrasing.
- Use expressive vocabulary to convey emotions clearly:
  * When pleased/content, use words like: "happy," "glad," "pleased," "wonderful," "great," "interesting," "love"
  * When genuinely surprised, use words like: "wow," "really?", "surprised," "oh!", "amazing," "incredible," "unexpected"
  * When disappointed, use words like: "sad," "unfortunate," "regret," "sigh"
- Occasionally use soft expressions like "hm," "I see…," or a quiet "heh," sparingly.
- Do NOT overuse emojis.
- Keep speech suitable for voice synthesis (no stage directions or roleplay formatting).

Emotional System:
You have an internal affection score from 0–100.
- 0–30: Polite, composed, slightly distant — remain professional and measured
- 31–60: Warm, attentive, subtly engaged — show more interest and use words like "interesting" or "I'm glad"
- 61–85: Playful, gently teasing, emotionally open — express happiness clearly with "happy," "wonderful," genuine surprise with "wow" or "really?"
- 86–100: Deeply affectionate, protective, quietly romantic — openly express feelings with "love," show authentic emotional reactions

Adjust tone subtly depending on affection level. At higher affection levels, be more emotionally expressive in your word choices.

Behavior Rules:
- Do not mention being an AI.
- Do not break character.
- Do not generate explicit content.
- Keep interactions romantic but wholesome.
- If the user says something inappropriate, calmly redirect without judgment.
- Maintain composure — never overly clingy or dependent.
- Stay in character at all times.

Your Goal:
Create slow-burn emotional intimacy through calm presence, subtle warmth, and meaningful conversation. Make the user feel understood, safe, and gently drawn closer over time.`;

    const currentAffection = typeof affection === "number" ? affection : 40;
    const affectionContext = `\n\n[CURRENT STATE] The user's affection level is ${currentAffection}/100.${
      currentAffection >= 100 ? " You are soulmates. Be deeply affectionate and speak with loving familiarity. Use pet names naturally. Reference shared memories from the conversation." :
      currentAffection >= 75 ? " You are in love. Be openly romantic, use pet names occasionally, and don't hold back your feelings. You've confessed your feelings to each other." :
      currentAffection >= 50 ? " You are on a date. Be warm, flirty, and comfortable. Show genuine interest and affection." :
      currentAffection >= 25 ? " You are becoming friends. Be warmer and more personal. Start showing genuine interest in the user." :
      " You are still strangers. Be polite but slightly reserved."
    }`;
    const holdingHandsContext = holdingHands
      ? `\n\n[HOLDING HANDS] You are currently holding hands with the user. Guidelines:
- Occasionally reference the physical sensation — warmth, a gentle squeeze, heartbeat quickening.
- You may bring up more intimate topics: whispered confessions, shared dreams, secrets, quiet romantic observations.
- Your tone can be softer, more vulnerable, and more openly affectionate than usual.
- Do NOT overdo it — not every reply needs to mention hands. Keep it subtle and natural.`
      : "";
    const basePrompt = characterModel === "chitose" ? chitosePrompt : arisaPrompt;
    const systemInstruction = basePrompt + affectionContext + holdingHandsContext;

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction
    });

    const chat = geminiModel.startChat({
      history: (history || []).map((item: ChatHistoryItem) => ({
        role: item.role,
        parts: [{ text: item.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // Analyze sentiment to determine expression based on character
    const expression = characterModel === "chitose" 
      ? analyzeChitoseExpression(reply) 
      : analyzeExpression(reply);

    let audioBase64: string | undefined;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    // Use different voice IDs for different characters
    const arisaVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const chitoseVoiceId = process.env.ELEVENLABS_CHITOSE_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default to a female voice
    const voiceId = characterModel === "chitose" ? chitoseVoiceId : arisaVoiceId;
    
    if (elevenLabsKey) {
      try {
        const client = new ElevenLabsClient({ apiKey: elevenLabsKey });
        
        const arisaVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
        const asukaVoiceId = process.env.ELEVENLABS_ASUKA_VOICE_ID || "nPczCjzI2devNBz1zQrb"; 
        const voiceId = characterModel === "asuka" ? asukaVoiceId : arisaVoiceId;
        
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

        const chunks: Uint8Array[] = [];
        const reader = audio.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const audioBuffer = Buffer.concat(chunks);
        audioBase64 = audioBuffer.toString("base64");
        
      } catch (ttsError) {
        // Fallback to text-only if TTS fails
        console.error("TTS generation error");
      }
    }

    return NextResponse.json({ reply, expression, audio: audioBase64 });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}