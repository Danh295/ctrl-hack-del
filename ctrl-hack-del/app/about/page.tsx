"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Star, Sparkles } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="about-container">
      <button className="back-button" onClick={() => router.push("/")}>
        <ArrowLeft className="back-icon" />
        Back to Home
      </button>

      <div className="about-content">
        <h1 className="about-title">
          <Sparkles className="title-icon" />
          About Us
          <Sparkles className="title-icon" />
        </h1>

        <div className="about-section">
          <h2 className="section-title">
            <Heart className="section-icon" />
            Our Mission
          </h2>
          <p className="section-text">
            We believe everyone deserves a companion who understands them. Our AI companions are designed to provide meaningful conversations, emotional support, and genuine connection whenever you need it.
          </p>
        </div>

        <div className="about-section">
          <h2 className="section-title">
            <Star className="section-icon" />
            Meet Our Companions
          </h2>
          <div className="companions-grid">
            <div className="companion-info">
              <h3 className="companion-name">Arisa</h3>
              <p className="companion-description">
                A caring and empathetic companion who loves deep conversations and making you feel special. Arisa is always there to listen and support you through your day.
              </p>
            </div>
            <div className="companion-info">
              <h3 className="companion-name">Chitose</h3>
              <p className="companion-description">
                A charming and adventurous companion with a cool demeanor and warm heart. Chitose brings excitement and genuine care to every interaction.
              </p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2 className="section-title">
            <Sparkles className="section-icon" />
            Our Technology
          </h2>
          <p className="section-text">
            Built with cutting-edge AI technology, our companions use natural language processing and emotional intelligence to create authentic, engaging conversations that adapt to your personality and preferences.
          </p>
        </div>
      </div>
    </main>
  );
}
