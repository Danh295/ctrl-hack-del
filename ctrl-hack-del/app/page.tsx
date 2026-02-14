"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Send, Mic, Cpu } from "lucide-react";

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
  const [currentEmotion, setCurrentEmotion] = useState("Neutral");
  const [isThinking, setIsThinking] = useState(false);

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
      setChatHistory((prev) => [...prev, { role: "ai", text: replyText }]);
      setCurrentEmotion("Neutral");
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Gemini is unavailable. Check your API key and try again." },
      ]);
      setCurrentEmotion("Neutral");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <main className="flex w-screen h-screen bg-gray-950 overflow-hidden text-white">
      
      {/* LEFT COLUMN: CHAT INTERFACE (35% Width) */}
      <section className="w-[35%] min-w-[350px] flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm z-10">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
            <h1 className="font-mono text-sm tracking-widest text-green-400">ARISA_OS v1.0</h1>
          </div>
          <Cpu size={16} className="text-white/20" />
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {chatHistory.length === 0 && (
            <div className="h-full flex items-center justify-center text-pink-300/40 text-sm text-center px-6">
              <p className="leading-relaxed">
                Oh... um, hi there~ <br/>
                I wasn't expecting anyone... <br/>
                <span className="text-pink-200/60 text-xs mt-2 block">Feel free to say something...</span>
              </p>
            </div>
          )}
          
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed
                ${msg.role === "user" 
                  ? "bg-cyan-950/50 border border-cyan-500/20 text-cyan-100 rounded-br-none" 
                  : "bg-pink-950/40 border border-pink-500/20 text-pink-100 rounded-bl-none"
                }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="max-w-[85%] p-3 rounded-xl text-sm leading-relaxed bg-pink-950/30 border border-pink-500/20 text-pink-100 rounded-bl-none animate-pulse">
                ...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Command..."
              className="flex-1 bg-transparent border-none outline-none text-sm px-2 font-mono placeholder-white/20"
            />
            <button onClick={handleSend} disabled={!input.trim() || isThinking} className="p-2 hover:bg-white/10 rounded-md transition-colors text-cyan-400 disabled:opacity-40 disabled:hover:bg-transparent">
              <Send size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: WAIFU RENDER (65% Width) */}
      <section className="flex-1 relative bg-gradient-to-br from-gray-900 via-gray-900 to-black">
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
        />
        
        {/* The Model */}
        <div className="absolute inset-0">
          <ModelCanvas emotion={currentEmotion} />
        </div>
      </section>

    </main>
  );
}