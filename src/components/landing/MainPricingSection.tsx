import { useEffect, useRef } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { trackPricingViewed } from "../../lib/analytics";

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
    popular: true,
  },
];

export function MainPricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
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
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="pricing" className="py-24 bg-muted/50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 mb-6">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Simple Pricing</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Choose Your <span className="gradient-text">Protection Level</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and upgrade when you need unlimited access to all features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 ${
                plan.popular ? "glass border-2 border-primary shadow-xl" : "bg-card border border-border"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full gradient-bg text-sm font-semibold text-primary-foreground shadow-lg">
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
              <ul className="space-y-4">
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
            </div>
          ))}
        </div>

        {/* Trust Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Start with a 7-day free trial. Accounts can be created when Scamly is released to the App Store and Google Play.
          <br />
          All prices displayed are in USD.
        </p>
      </div>
    </section>
  );
}
