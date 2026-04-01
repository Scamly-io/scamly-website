import { Sparkles } from "lucide-react";
import phoneMockup from "../../assets/3d-phone-mockup.png";
import appStoreBadge from "../../assets/badge-app-store.png";
import googlePlayBadge from "../../assets/badge-google-play.png";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] py-28 md:py-32 lg:py-36 bg-zinc-50 overflow-hidden">
      {/* Soft animated gradient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[140%] h-[80%] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(ellipse at 30% 20%, #faf5ff 0%, #e0f2fe 35%, #ecfdf5 65%, transparent 100%)",
            animation: "heroGlow 12s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute -top-1/4 left-1/3 w-[100%] h-[60%] rounded-full opacity-80 blur-3xl"
          style={{
            background: "radial-gradient(ellipse at 70% 30%, #e0f2fe 0%, #faf5ff 40%, #ecfdf5 80%, transparent 100%)",
            animation: "heroGlow 12s ease-in-out 4s infinite alternate-reverse",
          }}
        />
        <div
          className="absolute -top-1/4 right-1/4 w-[80%] h-[50%] rounded-full opacity-65 blur-3xl"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, #ecfdf5 0%, #e0f2fe 50%, #faf5ff 100%)",
            animation: "heroGlow 12s ease-in-out 8s infinite alternate",
          }}
        />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side — Text content */}
          <div className="flex flex-col items-start">
            {/* Pill badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm mb-8 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.1s" }}
            >
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-muted-foreground">AI-powered scam protection</span>
            </div>

            {/* Title */}
            <h1
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4 text-foreground opacity-0 animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              The world's best scam protection app
            </h1>

            {/* Subtitle */}
            <p
              className="text-xl md:text-2xl text-foreground/80 mb-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              Stay safe from scams with a simple screenshot
            </p>

            {/* Description */}
            <p
              className="text-base md:text-lg text-muted-foreground max-w-xl mb-8 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.4s" }}
            >
              Meet Scamly, the world's best scam protection app that allows you to screenshot any form of online media
              and tell instantly if it is a scam.
            </p>

            {/* App store badges */}
            <div
              className="flex flex-wrap items-center gap-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.5s" }}
            >
              <a
                href="https://apps.apple.com/app/scamly"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <img src={appStoreBadge} alt="Download on the App Store" className="h-12 md:h-14 w-auto" />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.scamly"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <img src={googlePlayBadge} alt="Get it on Google Play" className="h-12 md:h-14 w-auto" />
              </a>
            </div>
          </div>

          {/* Right side — Phone mockup */}
          <div
            className="flex justify-center lg:justify-end opacity-0 animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            <img
              src={phoneMockup}
              alt="Scamly app showing fraud detection features on mobile phones"
              className="max-w-[500px] lg:max-w-[600px] w-full h-auto drop-shadow-2xl"
              fetchPriority="high"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
