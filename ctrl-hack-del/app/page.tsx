"use client";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Shuffle, Info } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [timeOfDay, setTimeOfDay] = useState("afternoon");
  const [hearts, setHearts] = useState<Array<{ left: string; delay: string; duration: string; color: string }>>([]);

  useEffect(() => {
    const colors = ['#ff6b6b', '#ff8585', '#ffa0a0', '#ffb3c6', '#ff4d4d', '#ff9999', '#ff7575'];
    const generatedHearts = [...Array(15)].map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${8 + Math.random() * 4}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setHearts(generatedHearts);
  }, []);

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
    const interval = setInterval(updateTimeOfDay, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectModel = (model: string) => {
    if (model === "random") {
      const randomModel = Math.random() > 0.5 ? "arisa" : "chitose";
      router.push(`/chat?model=${randomModel}`);
    } else {
      router.push(`/chat?model=${model}`);
    }
  };

  return (
    <main className="landing-container">
      <div className="floating-hearts">
        {hearts.map((heart, i) => (
          <div
            key={i}
            className="heart"
            style={{
              left: heart.left,
              animationDelay: heart.delay,
              animationDuration: heart.duration,
              color: heart.color,
            }}
          >
            ♥
          </div>
        ))}
      </div>

      <div className="landing-content">
        <h1 className="landing-title">
          <Sparkles className="title-icon" />
          Choose Your Companion
          <Sparkles className="title-icon" />
        </h1>
        
        <p className="landing-subtitle">
          Whether it be with a loved one, friends, or one of our characters, <br></br>No one should spend Valentine's Day Alone! 
        </p>

        <div className="model-selection-grid">
          <button 
            className="model-card arisa-card"
            onClick={() => handleSelectModel("arisa")}
          >
            <div className="model-card-content">
              <Heart className="model-icon" />
              <h2 className="model-name">Arisa</h2>
              <p className="model-description">
                Your caring girlfriend who loves spending time with you
              </p>
            </div>
            <div className="model-card-hover">
              <span>Click to start</span>
            </div>
          </button>

          {/* Chitose Button */}
          <button 
            className="model-card chitose-card"
            onClick={() => handleSelectModel("chitose")}
          >
            <div className="model-card-content">
              <Heart className="model-icon" />
              <h2 className="model-name">Chitose</h2>
              <p className="model-description">
                Your elegant and refined boyfriend
              </p>
            </div>
            <div className="model-card-hover">
              <span>Click to start</span>
            </div>
          </button>

          <button 
            className="model-card random-card"
            onClick={() => handleSelectModel("random")}
          >
            <div className="model-card-content">
              <Shuffle className="model-icon" />
              <h2 className="model-name">Surprise Me!</h2>
              <p className="model-description">
                Let fate decide your companion for today
              </p>
            </div>
            <div className="model-card-hover">
              <span>Click to start</span>
            </div>
          </button>

          <button 
            className="model-card about-card"
            onClick={() => router.push("/about")}
          >
            <div className="model-card-content">
              <Info className="model-icon" />
              <h2 className="model-name">About Us</h2>
              <p className="model-description">
                Learn more about our companions and mission
              </p>
            </div>
            <div className="model-card-hover">
              <span>Learn more</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}