import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";
import { trackPricingViewed, trackSignupStarted } from "@/lib/analytics";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic scam protection",
    features: [
      { text: "6 scans per month", included: true },
      { text: "Basic scam detection", included: true },
      { text: "Limited library access", included: true },
      { text: "AI Chat Assistant", included: false },
      { text: "Contact Search Tool", included: false },
      { text: "Full library access", included: false },
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "$4.99",
    period: "per month",
    yearlyPrice: "$49.99/year",
    yearlySavings: "Save $10",
    description: "Unlimited protection for peace of mind",
    features: [
      { text: "Unlimited scans", included: true },
      { text: "Advanced AI detection", included: true },
      { text: "Full library access", included: true },
      { text: "AI Chat Assistant", included: true },
      { text: "Contact Search Tool", included: true },
      { text: "First access to new features", included: true },
    ],
    cta: "Start 7-Day Free Trial",
    variant: "gradient" as const,
    popular: true,
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackPricingViewed();
          }
        });
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSignupClick = (planName: string) => {
    trackSignupStarted(`pricing_${planName.toLowerCase()}`);
  };

  return (
    <div ref={sectionRef} id="pricing" className="py-24 relative overflow-hidden px-8 md:px-12">
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
            <Sparkles className="w-4 h-4" style={{ color: "#5022f6" }} />
            <span className="text-sm font-medium text-white">Simple Pricing</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
            Pricing To Suit <span style={{ color: "#5022f6" }}>Everyone</span>
          </h2>
          <p className="text-lg text-slate-300">
            Start free and upgrade when you need unlimited access to all features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 ${
                plan.popular ? "bg-card shadow-xl" : "bg-card border border-border shadow-lg"
              }`}
              style={plan.popular ? { border: '2px solid #5022f6' } : undefined}
            >

              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span
                    className="px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-lg"
                    style={{ backgroundColor: "#5022f6" }}
                  >
                    7-Day Free Trial
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-display text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                {plan.yearlyPrice && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-muted-foreground">or {plan.yearlyPrice}</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                      {plan.yearlySavings}
                    </span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                {plan.popular && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
                    ✓ Try free for 7 days, cancel anytime
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground"}>{feature.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                size="lg"
                className={`w-full ${plan.popular ? "bg-[#5022f6] text-white hover:bg-[#5022f6]/90" : ""}`}
                variant={plan.popular ? "default" : "outline"}
                asChild
                onClick={() => handleSignupClick(plan.name)}
              >
                <Link to="/auth?mode=signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Trust Note */}
        <p className="text-center text-sm text-slate-400 mt-8">
          Start with a 7-day free trial. No credit card charged until trial ends. Cancel anytime.
          <br />
          All prices displayed are in USD.
        </p>
      </div>
    </div>
  );
}
