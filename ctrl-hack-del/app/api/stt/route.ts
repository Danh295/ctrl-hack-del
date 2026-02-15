import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("Missing ELEVENLABS_API_KEY");
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      console.error("No audio file in request");
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("Received audio file:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Convert the file to a buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Buffer size:", buffer.length);

    // Create a new FormData for the ElevenLabs API
    const elevenLabsFormData = new FormData();
    const audioBlob = new Blob([buffer], { type: audioFile.type });
    elevenLabsFormData.append("file", audioBlob, "audio.webm");
    elevenLabsFormData.append("model_id", "scribe_v2");

    console.log("Sending to ElevenLabs STT API...");

    // Call ElevenLabs Speech-to-Text API
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: elevenLabsFormData,
    });

    console.log("ElevenLabs response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STT Error:", errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Transcription successful:", data);
    
    return NextResponse.json({
      text: data.text || "",
    });
  } catch (error) {
    console.error("STT Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
