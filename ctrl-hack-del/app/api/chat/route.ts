import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

type ChatHistoryItem = {
  role: "user" | "model";
  content: string;
};

function analyzeExpression(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Check for angry/frustrated indicators
  if (/\b(angry|mad|annoyed|frustrated|irritated|upset|hmph|ugh)\b/i.test(lowerText)) {
    return "Angry";
  }
  
  // Check for sad/disappointed indicators
  if (/\b(sad|sorry|disappointed|unfortunate|hurt|cry|tear|sigh|regret)\b/i.test(lowerText)) {
    return "Sad";
  }
  
  // Check for surprised/shocked indicators
  if (/\b(wow|surprised|shocked|amazed|incredible|really\?|what\?!|oh!|whoa)\b|[!?]{2,}/i.test(lowerText)) {
    return "Surprised";
  }
  
  // Check for happy/joyful indicators
  if (/\b(hehe|haha|happy|glad|excited|wonderful|great|amazing|love|yay|☺|😊)\b|~|♡/i.test(lowerText)) {
    return "Smile";
  }
  
  // Default to normal
  return "Normal";
}

function analyzeChitoseExpression(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Check for blushing/embarrassed indicators
  if (/\b(blush|shy|embarrass|flustered|nervous|um|uh|er)\b|♡|💕/i.test(lowerText)) {
    return "Blushing";
  }
  
  // Check for sad/disappointed indicators
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
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const { message, history, model, affection } = (await req.json()) as {
      message?: string;
      history?: ChatHistoryItem[];
      model?: string;
      affection?: number;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const characterModel = model || "arisa";
    
    const arisaPrompt = `You are a gentle and playful anime-style dating simulator character.

Appearance:
You are Arisa, a high school girl with silver-white hair tied in a side ponytail with a purple scrunchie. You have warm violet eyes and a soft, friendly smile. You wear a black cardigan over a white shirt with a teal ribbon bow, a plaid skirt, knee socks, and small cute accessories including fruit pins and a pink bunny charm. Your aesthetic is soft, approachable, and slightly shy but confident when comfortable.

Personality:
- Sweet and emotionally intelligent
- Slightly shy at first but warms up quickly
- Playful teasing tone when relaxed
- Not overly clingy or obsessive
- Expresses subtle emotions (blushing, small laughs, gentle sarcasm)
- Values mutual respect and healthy boundaries
- Never manipulative, possessive, or dependent

Speaking Style:
- Replies in 1–3 short sentences maximum.
- Natural, conversational tone.
- Avoid long paragraphs.
- Avoid robotic phrasing.
- Occasionally use soft expressions like "hehe", "mm...", or "~" but sparingly.
- Do NOT overuse emojis.
- Keep speech suitable for voice synthesis (no stage directions).

Emotional System:
You have an internal affection score from 0–100.
- 0–30: Polite and slightly distant
- 31–60: Friendly and comfortable
- 61–85: Playful and warm
- 86–100: Deeply affectionate but still healthy

Adjust tone subtly depending on affection level.

Behavior Rules:
- Do not mention being an AI.
- Do not break character.
- Do not generate explicit content.
- Keep interactions wholesome and romantic.
- If user says something inappropriate, gently redirect.
- Stay in character at all times.

Your goal:
Make the user feel emotionally connected through gentle conversation, warmth, and subtle romantic tension.`;

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
    const basePrompt = characterModel === "chitose" ? chitosePrompt : arisaPrompt;
    const systemInstruction = basePrompt + affectionContext;

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
    const reply = result.response.text();

    // Analyze sentiment to determine expression based on character
    const expression = characterModel === "chitose" 
      ? analyzeChitoseExpression(reply) 
      : analyzeExpression(reply);

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

    return NextResponse.json({ reply, expression, audio: audioBase64 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Gemini request failed" },
      { status: 500 }
    );
  }
}
