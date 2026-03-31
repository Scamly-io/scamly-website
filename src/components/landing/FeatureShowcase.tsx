import TextType from "@/components/TextType";
import ScrollStack, { ScrollStackItem } from "@/components/ScrollStack";

export function FeatureShowcaseSection() {
  return (
    <section id="features" className="relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10 h-screen">
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

        {/* ScrollStack Features - simplified for testing */}
        <ScrollStack>
          <ScrollStackItem>
            <h3 className="font-display text-2xl font-bold mb-2">AI Scam Scanner</h3>
            <p className="text-muted-foreground">Upload screenshots of suspicious messages for instant risk assessments.</p>
          </ScrollStackItem>  
          <ScrollStackItem>
            <h3 className="font-display text-2xl font-bold mb-2">AI Chat Assistant</h3>
            <p className="text-muted-foreground">Have natural conversations about scams, fraud, and cybersecurity.</p>
          </ScrollStackItem>  
          <ScrollStackItem>
            <h3 className="font-display text-2xl font-bold mb-2">Contact Search</h3>
            <p className="text-muted-foreground">Find legitimate contact information for any company worldwide.</p>
          </ScrollStackItem>
          <ScrollStackItem>
            <h3 className="font-display text-2xl font-bold mb-2">Learning Library</h3>
            <p className="text-muted-foreground">Access articles, guides, and tips about scam prevention.</p>
          </ScrollStackItem>
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
