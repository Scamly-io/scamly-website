'use client'

import TextType from "../TextType";
import { GridPattern } from "../GridPattern";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";

import assistant from "../../../public/features/assistant.png";
import automaticProtection from "../../../public/features/automatic-protection.png";
import breachSearch from "../../../public/features/breach-search.png";
import alerts from "../../../public/features/alerts.png";
import articles from "../../../public/features/articles.png";

const features = [
  {
    title: "Automatic Protection",
    description:
      "Enable our context aware intelligent SMS monitoring to protect you automatically from scammers who try to contact you. With one button, you forget that scammers even exist as our system hides their messages and deletes them automatically after 90 days.",
    image: automaticProtection,
  },
  {
    title: "Scam Safety Assistant",
    description:
      "Ask our AI assistant any question about scams, fraud, or cybercrime. Screenshot any message, social media post, online account, website, or marketplace listing (and much more) and our AI will instantly tell you if you're being scammed.",
    image: assistant,
  },
  {
    title: "Scam Alerts",
    description:
      "Stop being surprised by new scams and let us do the investigating. Get push notifications to your phone when scammers become active and launch new scams. We do the research, you get alerted, you stay safe.",
    image: alerts,
  },
  {
    title: "Breach Search",
    description:
      "Get answers to how scammers keep contacting you by searching the dark web for your information. Get a detailed risk analysis based on what has been exposed, so you know what to do next, and where the scammers keep coming from.",
    image: breachSearch,
  },
  {
    title: "Scam Safety Guides",
    description:
      "Stop feeling like you can't keep up with scammers and let us take the heavy lifting. Our scam safety guides teach you everything you need to know to stay safe online, and protect yourself from losing your hard earned money to a scammer.",
    image: articles,
  },
];

export function FeatureShowcaseSection() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold mb-2">Everything you need to</h2>
          <div className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold text-[#5022f6] mb-6">
            <TextType
              text={["stay safe online.", "protect your family.", "avoid scammers."]}
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
        <div className="relative mx-auto rounded-2xl border border-border bg-card overflow-hidden">
          {/* Soft corner colors */}
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-70 -translate-x-1/4 translate-y-1/4 pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-70 translate-x-1/4 -translate-y-1/4 pointer-events-none" />
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
                          src={feature.image.src}
                          alt={feature.title}
                          className="w-[200px] sm:w-[240px] rounded-[40px] shadow-xl"
                        />
                      </div>

                      {/* Content */}
                      <div className="w-fit text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                          <h3 className="font-sans text-2xl md:text-3xl font-bold">{feature.title}</h3>
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
