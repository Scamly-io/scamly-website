import { cn } from "../../lib/utils";
import phoneMockup from "../../../public/hero-mockup.png";
import appStoreBadge from "../../../public/badge-app-store.png";

export function HeroSection({ tightTop = false }: { tightTop?: boolean }) {
  return (
    <section
      className={cn(
        "relative min-h-[90vh] overflow-hidden pb-28 md:pb-32 lg:pb-36",
        tightTop
          ? "pt-8 md:pt-10 lg:pt-12"
          : "pt-28 md:pt-32 lg:pt-36",
      )}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side — Text content */}
          <div className="flex flex-col items-start">
            {/* Pill badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm mb-8 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.1s" }}
            >
              <p className="text-sm font-bold text-muted-foreground">Trusted globally with a 5⭐ rating!</p>
            </div>

            {/* Title */}
            <h1
              className="font-sans text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4 text-foreground opacity-0 animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              The world's best scam protection app
            </h1>

            {/* Subtitle */}
            <p
              className="text-xl md:text-2xl text-foreground/80 mb-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.3s" }}
            >
              Stay safe from scams with the press of a button
            </p>

            {/* Description */}
            <p
              className="text-base md:text-lg text-muted-foreground max-w-xl mb-8 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.4s" }}
            >
              Meet Scamly, the world's best all-in-one scam protection app. Automatically stop scammers from contacting you with Scamly's automatic protection mode, and use our scam protection assistant to help keep you safe.
            </p>

            {/* App store badges */}
            <div
              className="flex flex-wrap items-center gap-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.5s" }}
            >
              <a
                href="https://apps.apple.com/app/id6759246327"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <img src={appStoreBadge.src} alt="Download on the App Store" className="h-12 md:h-14 w-auto" />
              </a>
            </div>
          </div>

          {/* Right side — Phone mockup */}
          <div
            className="flex justify-center lg:justify-end opacity-0 animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            <img
              src={phoneMockup.src}
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
