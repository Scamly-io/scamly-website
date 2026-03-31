import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextType from "@/components/TextType";

// Feature screenshots
import scanDark from "@/assets/features/scan-dark.png";
import scanLight from "@/assets/features/scan-light.png";
import chatDark from "@/assets/features/chat-dark.png";
import chatLight from "@/assets/features/chat-light.png";
import searchDark from "@/assets/features/search-dark.png";
import searchLight from "@/assets/features/search-light.png";
import libraryDark from "@/assets/features/library-dark.png";
import libraryLight from "@/assets/features/library-light.png";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "AI Scam Scanner",
    description:
      "Upload screenshots of suspicious messages, emails, or social media posts. Our AI analyzes content patterns and provides instant risk assessments with actionable advice.",
    imageDark: scanDark,
    imageLight: scanLight,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "AI Chat Assistant",
    description:
      "Have natural conversations about scams, fraud, and cybersecurity. Get personalized answers to complex questions and learn how to stay protected.",
    imageDark: chatDark,
    imageLight: chatLight,
    badge: "Premium",
    gradient: "from-primary to-secondary",
  },
  {
    title: "Contact Search",
    description:
      "Powered by Perplexity AI, find legitimate contact information for any company worldwide. Never fall for fake customer service scams again.",
    imageDark: searchDark,
    imageLight: searchLight,
    badge: "Beta",
    badgeVariant: "beta" as const,
    gradient: "from-orange-500 to-red-500",
  },
  {
    title: "Learning Library",
    description:
      "Access a comprehensive library of articles, guides, and tips about scam types, prevention strategies, and online safety best practices.",
    imageDark: libraryDark,
    imageLight: libraryLight,
    gradient: "from-green-500 to-emerald-500",
  },
];

function FeatureCard({
  feature,
}: {
  feature: (typeof features)[0];
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 py-16 md:py-24">
      <div className="glass border border-border/50 rounded-3xl px-6 py-5 md:px-10 md:py-6 max-w-4xl w-full shadow-2xl relative">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
          {/* Screenshot — oversized to stick out */}
          <div className="flex-shrink-0 -my-16 md:-my-20">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src={feature.imageLight}
                alt={feature.title}
                className="relative w-[240px] sm:w-[280px] md:w-[320px] rounded-[44px] shadow-2xl"
              />
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl animate-pulse" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
              <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {feature.title}
              </h3>
              {feature.badge && (
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    feature.badgeVariant === "beta"
                      ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                      : "gradient-bg text-primary-foreground"
                  }`}
                >
                  {feature.badge}
                </span>
              )}
            </div>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              {feature.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const container = cardsContainerRef.current;
    if (!section || !container) return;

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    const totalCards = cards.length;

    // Set initial state: first card visible, rest off-screen right
    gsap.set(cards[0], { xPercent: 0, opacity: 1 });
    cards.slice(1).forEach((card) => {
      gsap.set(card, { xPercent: 100, opacity: 0 });
    });

    // Create a timeline pinned to the section
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        // Much longer scroll distance per card
        end: () => `+=${(totalCards - 1) * 200}vh`,
        pin: true,
        scrub: 2.5,
        anticipatePin: 1,
      },
    });

    // Animate each card transition with long dwell time
    for (let i = 0; i < totalCards - 1; i++) {
      // Slide current card out left — slower duration
      tl.to(
        cards[i],
        {
          xPercent: -100,
          opacity: 0,
          duration: 1.5,
          ease: "power3.inOut",
        },
        i * 3 // 3 units spacing: 1.5 transition + 1.5 dwell
      );
      // Slide next card in from right
      tl.to(
        cards[i + 1],
        {
          xPercent: 0,
          opacity: 1,
          duration: 1.5,
          ease: "power3.inOut",
        },
        i * 3
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      tl.kill();
    };
  }, []);

  return (
    <section id="features" className="relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-hero-pattern opacity-30" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />

      {/* Header — NOT pinned */}
      <div className="relative z-10 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
              Everything You Need to
            </h2>
            <div className="font-display text-4xl md:text-5xl lg:text-6xl font-bold gradient-text mb-6">
              <TextType
                text={["stay safe", "protect your family", "avoid scammers"]}
                typingSpeed={45}
                deletingSpeed={25}
                pauseDuration={2000}
                showCursor
                cursorCharacter="_"
              />
            </div>
            <p className="text-lg text-muted-foreground">
              Scamly combines cutting-edge AI with practical tools to protect
              you from the dynamic landscape of online fraud and scams.
            </p>
          </div>
        </div>
      </div>

      {/* Scroll-pinned card stack */}
      <div
        ref={sectionRef}
        className="relative z-10"
      >
        <div
          ref={cardsContainerRef}
          className="relative h-[80vh] overflow-hidden"
        >
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="absolute inset-0"
            >
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: "90%", label: "Detection Accuracy" },
              { value: "500k+", label: "Scan Tokens Used" },
              { value: "24/7", label: "AI Protection" },
              { value: "170+", label: "Countries Covered" },
            ].map((stat) => (
              <div key={stat.label} className="text-center group">
                <p className="font-display text-3xl md:text-4xl font-bold gradient-text mb-1 transition-transform duration-300 group-hover:scale-110">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
