"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Send, Mic, Cpu, Volume2, VolumeX, Heart, ArrowLeft } from "lucide-react";

// Import Canvas with NO SSR
const ModelCanvas = dynamic(() => import("@/components/ModelCanvas"), {
  ssr: false,
});

interface Message {
  role: 'user' | 'ai';
  text: string;
  emotion?: string;
}

interface MenuItem {
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  // Coffee
  { name: "Cappuccino", price: 7, image: "/menu/coffee.png", category: "Coffee", description: "Rich espresso topped with velvety steamed milk foam" },
  { name: "Latte", price: 8, image: "/menu/latte.png", category: "Coffee", description: "Smooth espresso blended with creamy steamed milk" },
  { name: "Black Coffee", price: 4, image: "/menu/plain_latte.png", category: "Coffee", description: "A classic brew to warm the heart" },
  // Tea
  { name: "Tea", price: 4, image: "/menu/tea.png", category: "Tea", description: "Delicate loose-leaf tea, steeped to perfection" },
  { name: "Matcha Latte", price: 7, image: "/menu/matcha_latte.png", category: "Tea", description: "Ceremonial-grade matcha whisked with frothy milk" },
  // Cakes
  { name: "Strawberry Shortcake", price: 15, image: "/menu/shortcake.png", category: "Cakes", description: "Fluffy sponge layered with fresh strawberries and cream" },
  { name: "Blueberry Shortcake", price: 16, image: "/menu/blueberry_cake.png", category: "Cakes", description: "Bursting with juicy blueberries in every bite" },
  { name: "Chocolate Cake", price: 15, image: "/menu/chocolate_cake.png", category: "Cakes", description: "Decadent dark chocolate ganache for two" },
  { name: "Valentine's Special Cake", price: 18, image: "/menu/valentines_cake.png", category: "Cakes", description: "A special cake made just for two" },
  { name: "Matcha Cake", price: 16, image: "/menu/matcha_cake.png", category: "Cakes", description: "Earthy matcha sponge with white chocolate frosting" },
  // Pastry
  { name: "Macarons (4)", price: 12, image: "/menu/macarons.png", category: "Pastry", description: "Assorted French macarons, crisp shells with soft filling" },
  { name: "Crepes", price: 10, image: "/menu/crepe.png", category: "Pastry", description: "Thin French crepes drizzled with honey and berries" },
  // Smoothies
  { name: "Strawberry Smoothie", price: 12, image: "/menu/strawberry_smoothie.png", category: "Smoothies", description: "Fresh strawberries blended into a sweet pink dream" },
  { name: "Chocolate Smoothie", price: 12, image: "/menu/chocolate_smoothie.png", category: "Smoothies", description: "Indulgent chocolate blended smooth and creamy" },
  { name: "Mango Smoothie", price: 14, image: "/menu/mango_smoothie.png", category: "Smoothies", description: "Tropical mango puree, sunshine in a glass" },
  // Alcohol
  { name: "Whiskey", price: 15, image: "/menu/whiskey.png", category: "Alcohol", description: "Aged single malt, neat — for a bold date night" },
];

const MENU_CATEGORIES = ["Coffee", "Tea", "Cakes", "Pastry", "Smoothies", "Alcohol"];

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modelName = searchParams.get("model") || "arisa"; // Default to arisa
  
  // Affection system constants
  const AFFECTION_BASE_CHANGE = 5; // Base amount for changes
  const CAFE_DATE_THRESHOLD = 50; // Threshold to unlock cafe date
  
  // Emotion multipliers differ by character
  const ARISA_EMOTION_MULTIPLIERS: Record<string, number> = {
    "Smile": 3,      // Happy: +3x
    "Surprised": 2,  // Surprised: +2x
    "Normal": 0,     // Normal: no change
    "Sad": -0.5,     // Sad: -0.5x
    "Angry": -3      // Angry: -3x
  };

  const ASUKA_EMOTION_MULTIPLIERS: Record<string, number> = {
    "Smile": 3,      // Happy Sparkle: +3x
    "Surprised": 2,  // Star Eyes: +2x
    "Normal": 1,     // Default calm expression: +1x (gradual growth)
    "Sad": -0.5,     // Gloom: -0.5x
    "Angry": -1      // Gloom (angry context): -1x
  };

  const EMOTION_MULTIPLIERS = modelName === "asuka" 
    ? ASUKA_EMOTION_MULTIPLIERS 
    : ARISA_EMOTION_MULTIPLIERS;

  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState("Normal");
  const [isThinking, setIsThinking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeOfDay, setTimeOfDay] = useState("afternoon");
  const [isCafeDate, setIsCafeDate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [affection, setAffection] = useState(40); // Affection level (0-100)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Menu system state
  const [currency, setCurrency] = useState(50);
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuTab, setMenuTab] = useState("Coffee");

  const sendChatMessage = async (messageText: string) => {
    const userMsg: Message = { role: "user", text: messageText };
    setChatHistory((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const historyForApi = chatHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        content: msg.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history: historyForApi, model: modelName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch response");
      }

      const replyText = data?.reply || "(No response)";
      const expression = data?.expression || "Normal";
      const audioBase64 = data?.audio;

      setChatHistory((prev) => [...prev, { role: "ai", text: replyText, emotion: expression }]);
      setCurrentEmotion(expression);

      const multiplier = EMOTION_MULTIPLIERS[expression] ?? 0;
      if (multiplier !== 0) {
        const change = AFFECTION_BASE_CHANGE * multiplier;
        setAffection((prev) => Math.max(0, Math.min(100, prev + change)));
      }

      if (audioBase64 && isAudioEnabled) {
        playAudio(audioBase64);
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

  const handlePurchase = (item: MenuItem) => {
    if (currency < item.price || orderedItems.includes(item.name)) return;
    setCurrency((prev) => prev - item.price);
    setOrderedItems((prev) => [...prev, item.name]);
    setShowMenu(false);
    sendChatMessage(`I just ordered ${item.name} for us!`);
  };

  // Initial loading screen
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Loading screen when switching backgrounds
  useEffect(() => {
    if (isLoading) return; // Skip on initial load
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1500);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure you've granted permission.");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("STT API Error:", errorData);
        throw new Error(errorData.error || 'Transcription failed');
      }
      
      const data = await response.json();
      console.log("Transcription result:", data);
      if (data.text) {
        setInput(data.text);
      } else {
        console.warn("No text in transcription response");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const userInput = input;
    setInput("");
    await sendChatMessage(userInput);
  };

  return (
    <main className="chat-container">
      {/* Loading Screen */}
      {isLoading && (
        <div className="loading-screen">
          <p className="loading-text">travelling...</p>
        </div>
      )}
      
      {/* Back Button */}
      <button className="chat-back-button" onClick={() => router.push("/")}>
        <ArrowLeft size={16} />
      </button>

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
              <ModelCanvas emotion={currentEmotion} model={modelName} />
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
              <ModelCanvas emotion={currentEmotion} model={modelName} />
            </div>
            
            {/* Table Layer - In front of model */}
            <div
              className="parallax-layer table-layer"
              style={{
                transform: `translateX(${mousePos.x * 4}px)`
              }}
            />

            {/* Ordered items on table */}
            {orderedItems.length > 0 && (
              <div className="table-items" style={{ transform: `translateX(${mousePos.x * 4}px)` }}>
                {orderedItems.map((name, i) => {
                  const item = MENU_ITEMS.find((m) => m.name === name);
                  if (!item) return null;
                  return (
                    <div key={name} className="table-item" style={{ animationDelay: `${i * 0.1}s` }}>
                      <img src={item.image} alt={item.name} />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* AFFECTION METER */}
      <div className="affection-meter-container">
        <div className="affection-meter-label">
          <Heart size={14} fill="var(--soft-berry)" color="var(--soft-berry)" />
          <span>lvl</span>
        </div>
        <div className="affection-meter-bar">
          <div 
            className="affection-meter-fill"
            style={{ height: `${affection}%` }}
          >
            <div className="affection-meter-shine" />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: CHAT INTERFACE (35% Width) */}
      <section className="chat-section">
        
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="status-indicator" />
            <h1 className="chat-title">
              {modelName === "arisa" ? "Arisa (your girlfriend)" : "Asuka (your boyfriend)"}
            </h1>
          </div>
          <button 
            className={`cafe-date-btn ${affection < CAFE_DATE_THRESHOLD && !isCafeDate ? 'disabled' : ''}`}
            onClick={() => affection >= CAFE_DATE_THRESHOLD || isCafeDate ? setIsCafeDate(!isCafeDate) : null}
            title={affection < CAFE_DATE_THRESHOLD && !isCafeDate ? `Affection must be ${CAFE_DATE_THRESHOLD}+ to unlock` : ''}
          >
            {isCafeDate ? 'Back Home' : affection >= CAFE_DATE_THRESHOLD ? 'Cafe Date' : `🔒 ${CAFE_DATE_THRESHOLD}%`}
          </button>
          {isCafeDate && (
            <button
              className="cafe-date-btn menu-btn"
              onClick={() => setShowMenu(true)}
            >
              Menu
            </button>
          )}
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
                {modelName === "arisa" ? (
                  <>
                    Oh... um, hi there~ <br/>
                    I didn't think you'd show up today... <br/>
                  </>
                ) : (
                  <>
                    Hey there~ <br/>
                    Didn't think I'll get to see you today <br/>
                  </>
                )}
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
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isThinking}
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              <Mic size={16} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isTranscribing ? "Transcribing..." : "Command..."}
              className="chat-input"
              disabled={isRecording || isTranscribing}
            />
            <button onClick={handleSend} disabled={!input.trim() || isThinking} className="send-button">
              <Send size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Menu Modal */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            {/* Banner header */}
            <div className="menu-banner">
              <img src="/menu/menupage.png" alt="Our Menu" />
              <button className="menu-close" onClick={() => setShowMenu(false)}>✕</button>
            </div>

            {/* Currency display */}
            <div className="menu-currency">
              <span className="menu-currency-label">Your Balance</span>
              <span className="menu-currency-value">${currency}</span>
            </div>

            {/* Tab navigation */}
            <div className="menu-tabs">
              {MENU_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`menu-tab ${menuTab === cat ? "active" : ""}`}
                  onClick={() => setMenuTab(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Item grid */}
            <div className="menu-items">
              {MENU_ITEMS.filter((item) => item.category === menuTab).map((item) => {
                const isOrdered = orderedItems.includes(item.name);
                const canAfford = currency >= item.price;
                return (
                  <div
                    key={item.name}
                    className={`menu-item-card ${isOrdered ? "ordered" : ""} ${!canAfford && !isOrdered ? "cant-afford" : ""}`}
                  >
                    {isOrdered && <span className="on-table-badge">On table</span>}
                    <div className="menu-item-image">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="menu-item-info">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="menu-item-desc">{item.description}</span>
                      <span className="menu-item-price">${item.price}</span>
                    </div>
                    {!isOrdered && (
                      <button
                        className={`order-btn ${!canAfford ? "disabled" : ""}`}
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                      >
                        {canAfford ? "Order" : "Not enough $"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}