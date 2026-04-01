import TextType from "@/components/TextType";
import { GridPattern } from "@/components/GridPattern";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";


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
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-2">Everything You Need to</h2>
          <div className="font-display text-4xl md:text-5xl lg:text-6xl font-bold gradient-text mb-6">
            <TextType
              text={["stay safe", "protect your family", "avoid scammers"]}
              typingSpeed={60}
              deletingSpeed={45}
              pauseDuration={2500}
              cursorCharacter="|"
            />
          </div>
          <p className="text-lg text-muted-foreground">
            Scamly combines cutting-edge AI with practical tools to protect you from the dynamic landscape of online
            fraud and scams.
          </p>
        </div>

        {/* Feature Carousel Box */}
        <div className="relative max-w-5xl mx-auto rounded-2xl border border-border bg-card overflow-hidden">
          {/* Soft corner colors */}
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-100 rounded-full blur-3xl opacity-70 -translate-x-1/4 translate-y-1/4 pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-70 translate-x-1/4 -translate-y-1/4 pointer-events-none" />
          <GridPattern width={40} height={40} className="opacity-40" />

          <div className="relative z-10 p-8 md:p-12">
            <Carousel opts={{ loop: true }} className="w-full max-w-4xl mx-auto px-8">
              <CarouselContent>
                {features.map((feature) => (
                  <CarouselItem key={feature.title}>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 px-4 md:px-8">
                      {/* Screenshot */}
                      <div className="flex-shrink-0">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="w-[200px] sm:w-[240px] rounded-[40px] shadow-xl"
                        />
                      </div>

                      {/* Content */}
                      <div className="w-fit text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                          <h3 className="font-display text-2xl md:text-3xl font-bold">{feature.title}</h3>
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
                        <p className="text-sm md:text-base text-muted-foreground max-w-md">{feature.description}</p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-1" />
              <CarouselNext className="right-1" />
            </Carousel>
          </div>
        </div>

      </div>
    </section>
  );
}
