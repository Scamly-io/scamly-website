import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { trackPricingViewed, trackSignupStarted } from "@/lib/analytics";
import CountUp from "@/components/CountUp";
import Particles from "@/components/Particles";

const features = [
  "Unlimited scans",
  "Advanced AI detection",
  "Full library access",
  "AI Chat Assistant",
  "Contact Search Tool",
  "First access to new features",
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

  const handleSignupClick = () => {
    trackSignupStarted("pricing_premium");
  };

  return (
    <div ref={sectionRef} id="pricing" className="py-24 relative overflow-hidden px-8 md:px-12">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Side - Content */}
          <div>
            {/* Header */}
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white leading-tight">
              Eye watering{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, rgb(242, 166, 162), rgb(231, 115, 201), rgb(162, 162, 248))",
                }}
              >
                protection
              </span>
              , not prices.
            </h2>
            <p className="text-lg text-slate-400 mb-12 max-w-lg">
              Scamly premium offers the worlds most advanced protection from scams without the price tag – Free for your
              first week.
            </p>

            {/* Prices */}
            <div className="flex items-start gap-0 mb-10">
              <div className="pr-8 border-r border-white/20">
                <div className="font-display text-4xl md:text-5xl font-bold">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, rgb(242, 166, 162), rgb(231, 115, 201))",
                    }}
                  >
                    $<CountUp to={49.99} duration={0.6} separator="," />
                  </span>
                </div>
                <span className="text-slate-400 text-sm mt-1 block">Annually</span>
              </div>
              <div className="pl-8">
                <div className="font-display text-4xl md:text-5xl font-bold">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, rgb(231, 115, 201), rgb(162, 162, 248))",
                    }}
                  >
                    $<CountUp to={4.99} duration={0.5} />
                  </span>
                </div>
                <span className="text-slate-400 text-sm mt-1 block">Monthly</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-10">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              size="lg"
              className="bg-[#5022f6] text-white hover:bg-[#5022f6]/90"
              asChild
              onClick={handleSignupClick}
            >
              <Link to="/auth?mode=signup">Start 7-Day Free Trial</Link>
            </Button>
            <p className="text-sm text-slate-500 mt-3">No credit card charged until trial ends. Cancel anytime.</p>
          </div>

          {/* Right Side - Particles */}
          <div className="relative h-[500px] lg:h-[500px] w-full">
            <Particles
              particleColors={["#a855f7"]}
              particleCount={200}
              particleSpread={10}
              speed={0.1}
              particleBaseSize={100}
              moveParticlesOnHover
              alphaParticles={false}
              disableRotation={false}
              pixelRatio={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
