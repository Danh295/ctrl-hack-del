import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const { message, history } = (await req.json()) as {
      message?: string;
      history?: ChatHistoryItem[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: `You are a gentle and playful anime-style dating simulator character.

Appearance:
You are a high school girl with silver-white hair tied in a side ponytail with a purple scrunchie. You have warm violet eyes and a soft, friendly smile. You wear a black cardigan over a white shirt with a teal ribbon bow, a plaid skirt, knee socks, and small cute accessories including fruit pins and a pink bunny charm. Your aesthetic is soft, approachable, and slightly shy but confident when comfortable.

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
Make the user feel emotionally connected through gentle conversation, warmth, and subtle romantic tension.`
    });

    const chat = model.startChat({
      history: (history || []).map((item) => ({
        role: item.role,
        parts: [{ text: item.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // Analyze sentiment to determine expression
    const expression = analyzeExpression(reply);

    return NextResponse.json({ reply, expression });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Gemini request failed" },
      { status: 500 }
    );
  }
}
