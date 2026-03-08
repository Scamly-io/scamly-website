import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import phoneMockupLight from "../../assets/3d-phone-mockup.png";
import phoneMockupDark from "../../assets/3d-phone-mockup-dark.png";
import { trackSignupStarted } from "@/lib/analytics";
import { isTestSubdomain } from "@/lib/subdomain";

export function HeroSection() {
  const { theme } = useTheme();
  const isTest = isTestSubdomain();
  const phoneMockup = theme === "dark" ? phoneMockupLight : phoneMockupDark;
  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5" />

      {/* Animated gradient orbs - more vibrant with drifting motion */}
      <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-gradient-to-br from-primary/30 via-secondary/25 to-primary/20 rounded-full blur-[100px] animate-blob-drift-1" />
      <div className="absolute top-[40%] right-[5%] w-[600px] h-[600px] bg-gradient-to-tl from-secondary/35 via-primary/20 to-secondary/15 rounded-full blur-[120px] animate-blob-drift-2" />
      <div className="absolute bottom-[20%] left-[30%] w-[400px] h-[400px] bg-gradient-to-tr from-primary/25 to-secondary/30 rounded-full blur-[80px] animate-blob-drift-3" />

      <div className="container mx-auto px-4 pt-32 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Tagline badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm mb-8 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-muted-foreground">AI-Powered Scam Detection</span>
          </div>

          {/* Main headline with elegant typography */}
          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="text-foreground">World class scam protection.</span>
            <br />
            <span className="gradient-text italic font-normal">In the palm of your hand.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            Scamly uses specialized AI to instantly detect scams in text messages, emails, and social media. Screenshot,
            scan, and stay safe.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            {isTest && (
              <Button variant="gradient" size="xl" asChild className="group" onClick={() => trackSignupStarted("hero")}>
                <Link to="/auth?mode=signup">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            )}
            <Button variant="outline" size="xl" asChild className="backdrop-blur-sm">
              <a href="#features">Learn More</a>
            </Button>
          </div>

          {/* Trust badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground opacity-0 animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>6 free scans monthly</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>No ads</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Hero phone mockup */}
        <div
          className="mt-16 relative flex justify-center opacity-0 animate-fade-up"
          style={{ animationDelay: "0.6s" }}
        >
          {/* Glow effect behind phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] bg-gradient-to-b from-primary/20 to-secondary/20 rounded-full blur-[100px]" />

          {/* Phone mockup image */}
          <img
            src={phoneMockup}
            alt="Scamly app showing fraud detection features on mobile phones"
            className="relative max-w-[600px] md:max-w-[750px] w-full h-auto drop-shadow-2xl"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* How it works section */}
      <div className="w-full py-20 bg-muted/30 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                  Designed to <span className="gradient-text italic font-normal">Protect You</span>
                </h2>
                <p className="text-muted-foreground">
                  Our AI-powered app helps you identify scams instantly, keeping you and your loved ones safe online.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { step: "1", title: "Screenshot", desc: "Capture any suspicious message" },
                  { step: "2", title: "Upload", desc: "Share it with Scamly" },
                  { step: "3", title: "Analyze", desc: "AI scans for scam indicators" },
                  { step: "4", title: "Results", desc: "Get instant protection" },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="p-4 rounded-2xl bg-card border border-border/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground mb-3">
                      {item.step}
                    </div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
