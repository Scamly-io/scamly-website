import TextType from "@/components/TextType";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";

import scanLight from "@/assets/features/scan-light.png";
import chatLight from "@/assets/features/chat-light.png";
import searchLight from "@/assets/features/search-light.png";
import libraryLight from "@/assets/features/library-light.png";

const features = [
  {
    title: "AI Scam Scanner",
    description:
      "Upload screenshots of suspicious messages, emails, or websites for instant AI-powered risk assessments and detailed breakdowns.",
    image: scanLight,
  },
  {
    title: "AI Chat Assistant",
    description:
      "Have natural conversations about scams, fraud, and cybersecurity. Get personalised advice and guidance in real time.",
    image: chatLight,
  },
  {
    title: "Contact Search",
    description:
      "Find legitimate contact information for any company worldwide. Verify phone numbers, emails, and websites before engaging.",
    image: searchLight,
  },
  {
    title: "Learning Library",
    description:
      "Access articles, guides, and tips about scam prevention. Stay informed about the latest threats and how to avoid them.",
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
        <div className="h-96">
          <ScrollStack>
            {features.map((feature) => (
              <ScrollStackItem
                key={feature.title}
                itemClassName="bg-background/60 border border-border/50 backdrop-blur-xl !rounded-3xl !shadow-lg"
              >
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 h-full">
                  {/* Phone mockup */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="h-48 md:h-56 w-auto object-contain drop-shadow-xl"
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex flex-col justify-center text-center md:text-left">
                    <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>

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
