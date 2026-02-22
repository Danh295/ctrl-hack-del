"use client";
import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Send, Mic, Volume2, VolumeX, Heart, ArrowLeft } from "lucide-react";
import Receipt from "@/components/Receipt";
import { useToast } from "@/components/ToastProvider"; 

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
  { name: "Cappuccino", price: 7, image: "/menu/latte.png", category: "Coffee", description: "Rich espresso topped with velvety steamed milk foam" },
  { name: "Latte", price: 8, image: "/menu/plain_latte.png", category: "Coffee", description: "Smooth espresso blended with creamy steamed milk" },
  { name: "Black Coffee", price: 4, image: "/menu/coffee.png", category: "Coffee", description: "A classic brew to warm the heart" },
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

const DRINK_CATEGORIES = ["Coffee", "Tea", "Smoothies", "Alcohol"];
const FOOD_CATEGORIES = ["Cakes", "Pastry"];

interface Milestone {
  threshold: number;
  label: string;
  icon: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  { threshold: 25, label: "Getting Closer", icon: "💕", description: "They're starting to open up to you..." },
  { threshold: 50, label: "First Date", icon: "☕", description: "Cafe Date unlocked!" },
  { threshold: 75, label: "Confession", icon: "💝", description: "Something special is about to happen..." },
  { threshold: 100, label: "Soulmates", icon: "💖", description: "You've reached the deepest bond." },
];

function getRelationshipStage(affection: number) {
  if (affection >= 100) return { name: "Soulmates", tier: 4 };
  if (affection >= 75) return { name: "In Love", tier: 3 };
  if (affection >= 50) return { name: "Dating", tier: 2 };
  if (affection >= 25) return { name: "Friends", tier: 1 };
  return { name: "Strangers", tier: 0 };
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modelName = searchParams.get("model") || "arisa"; 
  const { addToast } = useToast(); // <-- Initialize Toast Hook
  
  // Affection system constants
  const AFFECTION_BASE_CHANGE = 20; 
  const CAFE_DATE_THRESHOLD = 50; 
  
  // Emotion multipliers differ by character
  const ARISA_EMOTION_MULTIPLIERS: Record<string, number> = {
    "Smile": 3, "Surprised": 2, "Normal": 0.5, "Sad": -0.5, "Angry": -2
  };

  const CHITOSE_EMOTION_MULTIPLIERS: Record<string, number> = {
    "Smile": 3, "Surprised": 2, "Normal": 1, "Sad": -0.5, "Angry": -1,
    "Blushing": 3, "Nervous": 2
  };

  const EMOTION_MULTIPLIERS = modelName === "chitose" 
    ? CHITOSE_EMOTION_MULTIPLIERS 
    : ARISA_EMOTION_MULTIPLIERS;

  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState("Normal");
  const [isThinking, setIsThinking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeOfDay, setTimeOfDay] = useState("afternoon");
  const [isCafeDate, setIsCafeDate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [affection, setAffection] = useState(40); 
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptTimestamp, setReceiptTimestamp] = useState<Date>(new Date());
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [shownMilestones, setShownMilestones] = useState<number[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [holdingHands, setHoldingHands] = useState(false);
  const stage = getRelationshipStage(affection);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [consecutiveAutoMsgs, setConsecutiveAutoMsgs] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [pendingMotion, setPendingMotion] = useState<string | null>(null);

  const [currency, setCurrency] = useState(50);
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuTab, setMenuTab] = useState("Coffee");

  // Memoize heart positions
  const heartStyles = useMemo(() =>
    Array.from({ length: 12 }).map(() => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 6}s`,
      animationDuration: `${6 + Math.random() * 4}s`,
      fontSize: `${1 + Math.random() * 1.2}rem`,
    })),
  []);

  // --- NEW: Check API Status on Load ---
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) return;
        const data = await res.json();

        // 1. Check Gemini
        if (!data.gemini?.ok) {
          addToast("⚠️ Gemini API Key is missing. The bot will not respond.", "error");
        }

        // 2. Check ElevenLabs
        if (!data.elevenLabs?.ok && data.elevenLabs?.error === "Out of characters") {
          addToast("🎙️ Voice disabled: ElevenLabs free tier character limit reached.", "error");
          setIsAudioEnabled(false); 
        } else if (!data.elevenLabs?.ok) {
           addToast("⚠️ Voice disabled: ElevenLabs API Key is missing or invalid.", "error");
           setIsAudioEnabled(false);
        } else if (data.elevenLabs?.remaining < 1000) {
          addToast(`⚠️ Running low on voice credits (${data.elevenLabs.remaining} chars left)`, "info");
        }
      } catch (error) {
        console.error("Failed to check API status", error);
      }
    };

    checkApiStatus();
  }, [addToast]);

  const getEffectiveExpression = (expression: string, aff: number): string => {
    if (aff < 15) {
      if (["Smile", "Blushing", "Nervous", "Surprised"].includes(expression)) return Math.random() < 0.6 ? "Angry" : "Sad";
      if (expression === "Normal") return Math.random() < 0.4 ? "Sad" : "Normal";
      return expression;
    }
    if (aff < 30) {
      if (["Smile", "Blushing", "Nervous"].includes(expression)) return "Normal";
      return expression;
    }
    if (aff < 50) {
      if (["Blushing", "Nervous"].includes(expression)) return "Normal";
      return expression;
    }
    if (aff >= 85) {
      if (expression === "Normal") return Math.random() < 0.6 ? "Smile" : "Normal";
      if (expression === "Smile" && modelName === "chitose") return Math.random() < 0.35 ? "Blushing" : "Smile";
      return expression;
    }
    if (aff >= 70) {
      if (expression === "Normal") return Math.random() < 0.4 ? "Smile" : "Normal";
      return expression;
    }
    return expression;
  };

  // Process Audio for Canvas (Replaces old playAudio)
  const processAudio = (base64Audio: string) => {
    try {
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(blob);
      setCurrentAudioUrl(audioUrl); // Pass to Canvas to trigger lip sync
    } catch (e) {
      console.error("Audio conversion failed", e);
    }
  };

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
        body: JSON.stringify({ message: messageText, history: historyForApi, model: modelName, affection, holdingHands }),
      });

      const data = await res.json();
      
      // --- NEW: Handle Errors & Toasts ---
      if (!res.ok) {
        const errorMsg = data?.error || "Failed to fetch response";
        if (res.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota")) {
          addToast("⚠️ API Limit Reached: Please try again later or check your billing.", "error");
        } else if (res.status === 500) {
          addToast("❌ Server Error: Check your API Keys in .env.local", "error");
        } else {
          addToast(`Error: ${errorMsg}`, "error");
        }
        throw new Error(errorMsg);
      }

      const replyText = data?.reply || "(No response)";
      const rawExpression = data?.expression || "Normal";
      const effectiveExpression = getEffectiveExpression(rawExpression, affection);
      const aiAffectionChange = data?.affectionChange;
      const motionTag = data?.motion;
      const audioBase64 = data?.audio;

      setChatHistory((prev) => [...prev, { role: "ai", text: replyText, emotion: effectiveExpression }]);
      setCurrentEmotion(effectiveExpression);

      if (motionTag && motionTag !== "none") {
        setPendingMotion(motionTag);
        setTimeout(() => setPendingMotion(null), 2000);
      }

      if (typeof aiAffectionChange === "number" && aiAffectionChange !== 0) {
        const handsBonus = holdingHands ? 1.5 : 1;
        setAffection((prev) => Math.max(0, Math.min(100, prev + aiAffectionChange * handsBonus)));
      } else {
        const multiplier = EMOTION_MULTIPLIERS[effectiveExpression] ?? 0;
        if (multiplier !== 0) {
          const handsBonus = holdingHands ? 1.5 : 1;
          const change = AFFECTION_BASE_CHANGE * multiplier * handsBonus;
          setAffection((prev) => Math.max(0, Math.min(100, prev + change)));
        }
      }

      if (audioBase64 && isAudioEnabled) {
        processAudio(audioBase64);
      }
    } catch (error: any) {
      console.error(error);
      if (!error.message?.includes("429") && !error.message?.includes("Server Error")) {
         addToast("Network Error: Could not connect to AI.", "error");
      }
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Connection failed. (Check notifications)" },
      ]);
      setCurrentEmotion("Sad");
    } finally {
      setIsThinking(false);
    }
  };

  const sendAutoMessage = async () => {
    setIsThinking(true);
    try {
      const historyForApi = chatHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        content: msg.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoMessage: true, history: historyForApi, model: modelName, affection, holdingHands }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Auto-message failed");

      const replyText = data?.reply || "(No response)";
      const rawExpression = data?.expression || "Normal";
      const effectiveExpression = getEffectiveExpression(rawExpression, affection);
      const aiAffectionChange = data?.affectionChange;
      const motionTag = data?.motion;
      const audioBase64 = data?.audio;

      setChatHistory((prev) => [...prev, { role: "ai", text: replyText, emotion: effectiveExpression }]);
      setCurrentEmotion(effectiveExpression);
      setConsecutiveAutoMsgs((prev) => prev + 1);

      if (motionTag && motionTag !== "none") {
        setPendingMotion(motionTag);
        setTimeout(() => setPendingMotion(null), 2000);
      }

      if (typeof aiAffectionChange === "number" && aiAffectionChange !== 0) {
        const handsBonus = holdingHands ? 1.5 : 1;
        setAffection((prev) => Math.max(0, Math.min(100, prev + aiAffectionChange * handsBonus)));
      } else {
        const multiplier = EMOTION_MULTIPLIERS[effectiveExpression] ?? 0;
        if (multiplier !== 0) {
          const handsBonus = holdingHands ? 1.5 : 1;
          const change = AFFECTION_BASE_CHANGE * multiplier * handsBonus;
          setAffection((prev) => Math.max(0, Math.min(100, prev + change)));
        }
      }

      if (audioBase64 && isAudioEnabled) {
        processAudio(audioBase64);
      }
    } catch {
      // Silently swallow errors for auto-messages
    } finally {
      setIsThinking(false);
    }
  };

  const orderTotal = orderedItems.reduce((sum, name) => {
    const item = MENU_ITEMS.find((m) => m.name === name);
    return sum + (item?.price ?? 0);
  }, 0);
  const availableBalance = currency - orderTotal;

  const currentDrink = orderedItems.find((name) => {
    const m = MENU_ITEMS.find((i) => i.name === name);
    return m && DRINK_CATEGORIES.includes(m.category);
  });
  const currentFood = orderedItems.find((name) => {
    const m = MENU_ITEMS.find((i) => i.name === name);
    return m && FOOD_CATEGORIES.includes(m.category);
  });

  const getEffectiveCost = (item: MenuItem) => {
    const isDrink = DRINK_CATEGORIES.includes(item.category);
    const replacedName = isDrink ? currentDrink : currentFood;
    const replacedPrice = replacedName
      ? (MENU_ITEMS.find((m) => m.name === replacedName)?.price ?? 0)
      : 0;
    return item.price - replacedPrice;
  };

  const handlePurchase = (item: MenuItem) => {
    if (orderedItems.includes(item.name)) return;
    const effectiveCost = getEffectiveCost(item);
    if (availableBalance < effectiveCost) return;

    const isDrink = DRINK_CATEGORIES.includes(item.category);
    setOrderedItems((prev) => {
      const filtered = prev.filter((name) => {
        const existing = MENU_ITEMS.find((m) => m.name === name);
        if (!existing) return true;
        return isDrink
          ? !DRINK_CATEGORIES.includes(existing.category)
          : !FOOD_CATEGORIES.includes(existing.category);
      });
      return [...filtered, item.name];
    });
    sendChatMessage(`I just ordered ${item.name} for us!`);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) return; 
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [isCafeDate]);

  useEffect(() => {
    for (const milestone of MILESTONES) {
      if (affection >= milestone.threshold && !shownMilestones.includes(milestone.threshold)) {
        setShownMilestones((prev) => [...prev, milestone.threshold]);
        setActiveMilestone(milestone);
        const timer = setTimeout(() => setActiveMilestone(null), 4000);
        if (milestone.threshold === 75) {
          const confessionName = modelName === "arisa" ? "Arisa" : "Chitose";
          setTimeout(() => {
            sendChatMessage(`[${confessionName} looks at you with a tender expression]`);
          }, 1500);
        }
        return () => clearTimeout(timer);
      }
    }
  }, [affection]);

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setTimeOfDay("morning");
      else if (hour >= 12 && hour < 17) setTimeOfDay("afternoon");
      else if (hour >= 17 && hour < 20) setTimeOfDay("evening");
      else setTimeOfDay("night");
    };

    updateTimeOfDay();
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

  const isUserTyping = input.trim().length > 0;

  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isThinking || isLoading || showMenu || consecutiveAutoMsgs >= 3 || isUserTyping) return;

    const lastMsg = chatHistory[chatHistory.length - 1];
    const lastWasAuto = lastMsg?.role === "ai" && consecutiveAutoMsgs > 0;
    const delay = lastWasAuto
      ? 20000 + Math.random() * 5000  
      : 15000 + Math.random() * 5000;  

    idleTimerRef.current = setTimeout(() => {
      sendAutoMessage();
    }, delay);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [chatHistory, isThinking, isLoading, showMenu, consecutiveAutoMsgs, isUserTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isThinking]);

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
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      addToast("Could not access microphone. Please check your permissions.", "error");
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
      if (data.text) {
        setInput(data.text);
      } else {
        console.warn("No text in transcription response");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      addToast(`Failed to transcribe audio: ${error.message || 'Unknown error'}`, "error");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const userInput = input;
    setInput("");
    setConsecutiveAutoMsgs(0);
    await sendChatMessage(userInput);
  };

  return (
    <main className="chat-container">
      {isLoading && (
        <div className="loading-screen">
          <p className="loading-text">travelling...</p>
        </div>
      )}
      
      <button className="chat-back-button" onClick={() => {
        if (isCafeDate) {
          setReceiptTimestamp(new Date());
          setShowReceipt(true);
        } else {
          router.push("/");
        }
      }}>
        <ArrowLeft size={16} />
      </button>

      <section className="model-section">
        {!isCafeDate ? (
          <>
            <div className={`parallax-layer sky-layer sky-${timeOfDay}`} />
            <div className="parallax-layer house-layer" />
            <div className="parallax-layer bush-layer" style={{ transform: `translateX(${mousePos.x * 8}px)` }} />
            <div className="model-wrapper" style={{ transform: `translateX(${mousePos.x * 20}px)` }}>
              <ModelCanvas emotion={currentEmotion} model={modelName} affection={affection} motion={pendingMotion} audioSrc={currentAudioUrl} />
            </div>
          </>
        ) : (
          <>
            <div className="parallax-layer cafe-background" />
            <div className="parallax-layer chair-layer" style={{ transform: `translateX(${mousePos.x * 10}px)` }} />
            <div className="model-wrapper cafe-model" style={{ transform: `translateX(${mousePos.x * 15}px)` }}>
              <ModelCanvas emotion={currentEmotion} model={modelName} affection={affection} motion={pendingMotion} audioSrc={currentAudioUrl} />
            </div>
            <div className="parallax-layer table-layer" style={{ transform: `translateX(${mousePos.x * 4}px)` }} />

            {orderedItems.length > 0 && (
              <div className="table-items" style={{ transform: `translateX(${mousePos.x * 4}px)` }}>
                {orderedItems.map((name, i) => {
                  const item = MENU_ITEMS.find((m) => m.name === name);
                  if (!item) return null;
                  return (
                    <div key={name} className={`table-item ${item.category === "Cakes" ? "table-item-cake" : ""}`} style={{ animationDelay: `${i * 0.1}s` }}>
                      <img src={item.image} alt={item.name} />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        <div className={`warmth-vignette ${holdingHands ? "active" : ""}`} />
      </section>

      <div className="affection-meter-container">
        <div className="affection-meter-label">
          <Heart size={14} fill="var(--soft-berry)" color="var(--soft-berry)" />
          <span>lvl</span>
        </div>
        <div className="meter-bar-wrapper">
          <div className="affection-meter-bar">
            <div
              className={`affection-meter-fill stage-${stage.tier}`}
              style={{ height: `${affection}%` }}
            >
              <div className="affection-meter-shine" />
            </div>
          </div>
          {MILESTONES.map((m) => (
            <div
              key={m.threshold}
              className={`meter-tick ${affection >= m.threshold ? "reached" : ""}`}
              style={{ bottom: `${m.threshold}%` }}
              title={m.label}
            />
          ))}
        </div>
        <span className="stage-label">{stage.name}</span>
      </div>

      <section className="chat-section">
        <div className="chat-header">
          <div className="chat-header-top">
            <div className="chat-header-content">
              <div className="status-indicator" />
              <h1 className="chat-title">
                {modelName === "arisa" ? "Arisa (your girlfriend)" : "Chitose (your boyfriend)"}
              </h1>
            </div>
            <div className="header-currency">${currency}</div>
          </div>
          <div className="chat-header-actions">
            <button
              className={`header-action-btn ${affection < CAFE_DATE_THRESHOLD && !isCafeDate ? 'locked' : ''}`}
              onClick={() => {
                if (isCafeDate) {
                  setReceiptTimestamp(new Date());
                  setShowReceipt(true);
                } else if (affection >= CAFE_DATE_THRESHOLD) {
                  setIsCafeDate(true);
                }
              }}
              title={affection < CAFE_DATE_THRESHOLD && !isCafeDate ? `Affection must be ${CAFE_DATE_THRESHOLD}+ to unlock` : ''}
            >
              {isCafeDate ? 'Back Home' : affection >= CAFE_DATE_THRESHOLD ? 'Cafe Date' : `🔒 ${CAFE_DATE_THRESHOLD}%`}
            </button>
            {isCafeDate && (
              <button
                className="header-action-btn"
                onClick={() => setShowMenu(true)}
              >
                Menu
              </button>
            )}
            {affection >= 75 && (
              <button
                className={`header-action-btn ${holdingHands ? "active-hands" : ""}`}
                onClick={() => setHoldingHands(!holdingHands)}
                title={holdingHands ? "Let go" : "Hold hands (1.5x affection boost)"}
              >
                {holdingHands ? "🤝 Holding Hands" : "🫱 Hold Hands"}
              </button>
            )}
            <button
              className="header-action-btn icon-btn"
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              title={isAudioEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {chatHistory.length === 0 && (
            <div className="empty-chat">
              <p>
                {modelName === "arisa" ? (
                  <>
                    oh... um hey~ <br/>
                    i didnt think youd show up today... <br/>
                  </>
                ) : (
                  <>
                    hey there~ <br/>
                    didnt think id get to see you today <br/>
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
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

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

      {activeMilestone && (
        <div className="milestone-popup" onClick={() => setActiveMilestone(null)}>
          <span className="milestone-icon">{activeMilestone.icon}</span>
          <span className="milestone-label">{activeMilestone.label}</span>
          <span className="milestone-desc">{activeMilestone.description}</span>
        </div>
      )}

      {affection >= 100 && (
        <div className="soulmates-hearts">
          {heartStyles.map((style, i) => (
            <span key={i} className="soulmate-heart" style={style}>💖</span>
          ))}
        </div>
      )}

      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <div className="menu-header-text">
                <h2 className="menu-title">Place an Order</h2>
                <p className="menu-subtitle">Pick a drink and a treat for your date</p>
              </div>
              <button className="menu-close" onClick={() => setShowMenu(false)}>✕</button>
            </div>

            <div className="menu-currency">
              <span className="menu-currency-label">Available to spend</span>
              <span className="menu-currency-value">${availableBalance}</span>
            </div>

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

            <div className="menu-items">
              {MENU_ITEMS.filter((item) => item.category === menuTab).map((item) => {
                const isOrdered = orderedItems.includes(item.name);
                const canAfford = availableBalance >= getEffectiveCost(item);
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

      {showReceipt && (
        <Receipt
          modelName={modelName}
          timestamp={receiptTimestamp}
          items={orderedItems.map((name) => {
            const item = MENU_ITEMS.find((m) => m.name === name);
            return { name, price: item?.price ?? 0 };
          })}
          onPay={() => {
            setCurrency((prev) => prev - orderTotal);
            setShowReceipt(false);
            setIsCafeDate(false);
            setOrderedItems([]);
          }}
        />
      )}

    </main>
  );
}


export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="loading-screen">
        <p className="loading-text">loading...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
