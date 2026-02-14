"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Send, Mic, Cpu, Volume2, VolumeX } from "lucide-react";

// Import Canvas with NO SSR
const ModelCanvas = dynamic(() => import("@/components/ModelCanvas"), {
  ssr: false,
});

interface Message {
  role: 'user' | 'ai';
  text: string;
  emotion?: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState("Normal");
  const [isThinking, setIsThinking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeOfDay, setTimeOfDay] = useState("afternoon");
  const [isCafeDate, setIsCafeDate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial loading screen
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Loading screen when switching backgrounds
  useEffect(() => {
    if (isLoading) return; // Skip on initial load
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [isCafeDate]);

  // Detect time of day
  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        setTimeOfDay("morning");
      } else if (hour >= 12 && hour < 17) {
        setTimeOfDay("afternoon");
      } else if (hour >= 17 && hour < 20) {
        setTimeOfDay("evening");
      } else {
        setTimeOfDay("night");
      }
    };

    updateTimeOfDay();
    // Update every minute
    const interval = setInterval(updateTimeOfDay, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const playAudio = (base64Audio: string) => {
    try {
      console.log("🔊 Attempting to play audio...");
      
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Create new audio element
      const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
      audio.volume = 1.0; // Set to maximum volume
      audioRef.current = audio;
      
      audio.addEventListener('loadeddata', () => {
        console.log("✅ Audio loaded successfully");
      });
      
      audio.addEventListener('playing', () => {
        console.log("▶️ Audio is playing");
      });
      
      audio.play().catch(err => {
        console.error("❌ Audio playback failed:", err);
        alert("Audio playback failed. Please click anywhere on the page first to enable audio.");
      });
    } catch (error) {
      console.error("❌ Audio creation failed:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMsg: Message = { role: "user", text: input };
    const userInput = input;
    setChatHistory((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const historyForApi = chatHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        content: msg.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, history: historyForApi }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch response");
      }

      const replyText = data?.reply || "(No response)";
      const expression = data?.expression || "Normal";
      const audioBase64 = data?.audio;
      
      console.log("📝 Response received:", { 
        hasText: !!replyText, 
        hasAudio: !!audioBase64,
        audioEnabled: isAudioEnabled 
      });
      
      setChatHistory((prev) => [...prev, { role: "ai", text: replyText, emotion: expression }]);
      setCurrentEmotion(expression);
      
      // Play audio if available and enabled
      if (audioBase64 && isAudioEnabled) {
        console.log("🎵 Audio data received, attempting playback...");
        playAudio(audioBase64);
      } else if (!audioBase64) {
        console.warn("⚠️ No audio data in response. Check if ELEVENLABS_API_KEY is set in .env.local");
      }
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Gemini is unavailable. Check your API key and try again." },
      ]);
      setCurrentEmotion("Normal");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <main className="chat-container">
      {/* Loading Screen */}
      {isLoading && (
        <div className="loading-screen">
          <p className="loading-text">loading simulation</p>
        </div>
      )}
      
      {/* LEFT COLUMN: ARISA MODEL WITH PARALLAX (65% Width) */}
      <section className="model-section">
        {!isCafeDate ? (
          <>
            {/* BACKGROUND 1: Outdoor Scene */}
            {/* Sky Layer - Deepest */}
            <div 
              className={`parallax-layer sky-layer sky-${timeOfDay}`}
            />
            
            {/* House Layer */}
            <div 
              className="parallax-layer house-layer"
            />
            
            {/* Bush Layer */}
            <div 
              className="parallax-layer bush-layer"
              style={{
                transform: `translateX(${mousePos.x * 8}px)`
              }}
            />
            
            {/* The Model - Above all layers */}
            <div className="model-wrapper" style={{
              transform: `translateX(${mousePos.x * 20}px)`
            }}>
              <ModelCanvas emotion={currentEmotion} />
            </div>
          </>
        ) : (
          <>
            {/* BACKGROUND 2: Cafe Scene */}
            {/* Cafe Background - Static at the very back */}
            <div className="parallax-layer cafe-background" />
            
            {/* Chair Layer - Behind model */}
            <div 
              className="parallax-layer chair-layer"
              style={{
                transform: `translateX(${mousePos.x * 10}px)`
              }}
            />
            
            {/* The Model - Smaller size for cafe */}
            <div className="model-wrapper cafe-model" style={{
              transform: `translateX(${mousePos.x * 15}px)`
            }}>
              <ModelCanvas emotion={currentEmotion} />
            </div>
            
            {/* Table Layer - In front of model */}
            <div 
              className="parallax-layer table-layer"
              style={{
                transform: `translateX(${mousePos.x * 4}px)`
              }}
            />
          </>
        )}
      </section>

      {/* RIGHT COLUMN: CHAT INTERFACE (35% Width) */}
      <section className="chat-section">
        
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="status-indicator" />
            <h1 className="chat-title">Arisa (your girlfriend)</h1>
          </div>
          <button 
            className="cafe-date-btn"
            onClick={() => setIsCafeDate(!isCafeDate)}
          >
            {isCafeDate ? 'Back Home' : 'Cafe Date'}
          </button>
          <button 
            className="audio-toggle-btn"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            title={isAudioEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <Cpu size={16} className="header-icon" />
        </div>

        {/* Chat Area */}
        <div className="chat-messages">
          {chatHistory.length === 0 && (
            <div className="empty-chat">
              <p>
                Oh... um, hi there~ <br/>
                I didn't think you'd show up today... <br/>
              </p>
            </div>
          )}
          
          {chatHistory.map((msg, i) => (
            <div key={i} className={`message-wrapper ${msg.role}`}>
              <div className={`message-bubble ${msg.role}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="message-wrapper ai">
              <div className="message-bubble thinking">
                ...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Command..."
              className="chat-input"
            />
            <button onClick={handleSend} disabled={!input.trim() || isThinking} className="send-button">
              <Send size={16} />
            </button>
          </div>
        </div>
      </section>

    </main>
  );
}