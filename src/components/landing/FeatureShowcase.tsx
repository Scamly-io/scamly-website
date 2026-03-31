import TextType from "@/components/TextType";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";

// Feature screenshots
import scanLight from "@/assets/features/scan-light.png";
import chatLight from "@/assets/features/chat-light.png";
import searchLight from "@/assets/features/search-light.png";
import libraryLight from "@/assets/features/library-light.png";

const features = [
  {
    title: "AI Scam Scanner",
    description:
      "Upload screenshots of suspicious messages, emails, or social media posts. Our AI analyzes content patterns and provides instant risk assessments with actionable advice.",
    image: scanLight,
  },
  {
    title: "AI Chat Assistant",
    description:
      "Have natural conversations about scams, fraud, and cybersecurity. Get personalized answers to complex questions and learn how to stay protected.",
    image: chatLight,
    badge: "Premium",
  },
  {
    title: "Contact Search",
    description:
      "Powered by Perplexity AI, find legitimate contact information for any company worldwide. Never fall for fake customer service scams again.",
    image: searchLight,
    badge: "Beta",
    badgeVariant: "beta" as const,
  },
  {
    title: "Learning Library",
    description:
      "Access a comprehensive library of articles, guides, and tips about scam types, prevention strategies, and online safety best practices.",
    image: libraryLight,
  },
];

export function FeatureShowcaseSection() {
  return (
    <section id="features" className="relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Everything you need to
          </h2>
          <div className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 gradient-text">
            <TextType
              text={["stay safe", "protect your family", "avoid scammers"]}
              typingSpeed={45}
              deletingSpeed={25}
              pauseDuration={2000}
              showCursor
              cursorCharacter="_"
              cursorClassName="text-secondary"
              as="span"
            />
          </div>
          <p className="text-lg text-muted-foreground">
            Scamly combines cutting-edge AI with practical tools to protect you
            from the dynamic landscape of online fraud and scams.
          </p>
        </div>

        {/* ScrollStack Features */}
        <ScrollStack useWindowScroll>
          {features.map((feature) => (
            <ScrollStackItem
              key={feature.title}
              itemClassName="glass border border-border/50 backdrop-blur-xl !rounded-3xl !shadow-lg"
            >
              <div className="flex flex-col md:flex-row items-center gap-8 h-full">
                {/* Phone image */}
                <div className="flex-shrink-0">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-[140px] sm:w-[180px] md:w-[200px] rounded-[32px] shadow-xl"
                  />
                </div>

                {/* Text content */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                    <h3 className="font-display text-2xl md:text-3xl font-bold">
                      {feature.title}
                    </h3>
                    {feature.badge && (
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          feature.badgeVariant === "beta"
                            ? "bg-orange-500/20 text-orange-600 border border-orange-500/30"
                            : "gradient-bg text-primary-foreground"
                        }`}
                      >
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-base md:text-lg max-w-lg">
                    {feature.description}
                  </p>
                </div>
              </div>
            </ScrollStackItem>
          ))}
        </ScrollStack>

        {/* Stats */}
        <div className="py-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
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
    </section>
  );
}
