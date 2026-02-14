"use client";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState("afternoon");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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
    const interval = setInterval(updateTimeOfDay, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectModel = (model: string) => {
    if (model === "random") {
      const randomModel = Math.random() > 0.5 ? "arisa" : "asuka";
      router.push(`/chat?model=${randomModel}`);
    } else {
      router.push(`/chat?model=${model}`);
    }
  };

  return (
    <main className="landing-container">
      {isLoading && (
        <div className="loading-screen">
          <p className="loading-text">loading...</p>
        </div>
      )}

      {/* Background layers */}
      <div className={`parallax-layer sky-layer sky-${timeOfDay}`} />
      <div className="parallax-layer house-layer" />
      <div className="parallax-layer bush-layer" />

      {/* Main content */}
      <div className="landing-content">
        <h1 className="landing-title">
          <Sparkles className="title-icon" />
          Choose Your Companion
          <Sparkles className="title-icon" />
        </h1>
        
        <p className="landing-subtitle">
          Who would you like to spend time with today?
        </p>

        <div className="model-selection-grid">
          {/* Arisa Button */}
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

          {/* Asuka Button */}
          <button 
            className="model-card asuka-card"
            onClick={() => handleSelectModel("asuka")}
          >
            <div className="model-card-content">
              <Heart className="model-icon" />
              <h2 className="model-name">Asuka</h2>
              <p className="model-description">
                Your charming boyfriend ready for adventure
              </p>
            </div>
            <div className="model-card-hover">
              <span>Click to start</span>
            </div>
          </button>

          {/* Random Button */}
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
        </div>
      </div>
    </main>
  );
}
