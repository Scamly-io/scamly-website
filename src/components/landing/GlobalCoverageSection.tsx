import { useEffect, useRef, useState } from "react";
import WorldMap from "@/components/ui/world-map";
import { Globe, ShieldCheck } from "lucide-react";
import Threads from "@/components/Threads";
import CountUp from "@/components/CountUp";

const mapDots = [
  // Europe → North America
  { start: { lat: 50, lng: 10 }, end: { lat: 40, lng: -100 } },
  // North America → South America
  { start: { lat: 40, lng: -100 }, end: { lat: -15, lng: -60 } },
  // Europe → Africa
  { start: { lat: 50, lng: 10 }, end: { lat: 5, lng: 20 } },
  // Africa → Asia
  { start: { lat: 5, lng: 20 }, end: { lat: 35, lng: 90 } },
  // Asia → Singapore
  { start: { lat: 35, lng: 90 }, end: { lat: 1.35, lng: 103.82 } },
  // Singapore → Australia
  { start: { lat: 1.35, lng: 103.82 }, end: { lat: -25, lng: 135 } },
  // Australia → New Zealand
  { start: { lat: -25, lng: 135 }, end: { lat: -41, lng: 174 } },
  // New Zealand → South America
  { start: { lat: -41, lng: 174 }, end: { lat: -15, lng: -60 } },
  // Europe → Singapore
  { start: { lat: 50, lng: 10 }, end: { lat: 1.35, lng: 103.82 } },
  // North America → Asia
  { start: { lat: 40, lng: -100 }, end: { lat: 35, lng: 90 } },
];

export function GlobalCoverageSection() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [animateMap, setAnimateMap] = useState(false);

  useEffect(() => {
    const el = mapRef.current;
    if (!el || animateMap) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimateMap(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animateMap]);

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "rgb(13, 23, 48)" }}>
      <div className="container mx-auto px-4">
        <div className="border-x border-white/10 overflow-hidden">
          {/* World map area */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 px-8 pb-8 pt-32 md:px-12 md:pb-12 md:pt-36">
            {/* Left – Text */}
            <div className="lg:w-5/12 text-center lg:text-left">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Scam Protection That Works{" "}
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgb(242, 166, 162), rgb(231, 115, 201), rgb(162, 162, 248))",
                  }}
                >
                  Everywhere
                </span>
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Scams don't respect borders — and neither does Scamly. Our AI is trained on global fraud patterns, so
                whether you're in Sydney, London, or São Paulo, you get the same powerful protection.
              </p>
            </div>

            {/* Right – World Map */}
            <div ref={mapRef} className="lg:w-7/12 w-full min-h-[200px] lg:min-h-[320px]">
              <WorldMap dots={mapDots} lineColor="#f59e0b" animate={animateMap} />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Stats Container */}
          <div className="relative overflow-hidden pb-32" style={{ minHeight: "340px" }}>
            {/* Threads animated background */}
            <div className="absolute inset-0">
              <Threads
                colors={[
                  [0.96, 0.62, 0.04],
                  [0.7, 0.2, 0.9],
                  [0.5, 0.2, 1],
                ]}
                amplitude={1}
                distance={0.5}
              />
            </div>

            {/* Stats content */}
            <div className="relative z-10 flex items-end h-full min-h-[340px] px-8 md:px-12 pb-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
                {[
                  { value: 95, suffix: "%", label: "Detection Accuracy", duration: 1 },
                  { value: 500, suffix: "k+", label: "Scan Tokens Used", duration: 1.5 },
                  { value: 24, suffix: "/7", label: "AI Protection", duration: 1 },
                  { value: 170, suffix: "+", label: "Countries Covered", duration: 1.5 },
                ].map((stat, index) => (
                  <div key={stat.label} className="text-center group">
                    <p
                      className="font-display text-3xl md:text-4xl font-bold text-transparent bg-clip-text mb-1 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, rgb(242, 166, 162), rgb(231, 115, 201), rgb(162, 162, 248))",
                      }}
                    >
                      <CountUp
                        from={0}
                        to={stat.value}
                        direction="up"
                        duration={stat.duration}
                        delay={index * 0.15}
                        separator=","
                      />
                      {stat.suffix}
                    </p>
                    <p className="text-sm text-slate-400">{stat.label}</p>
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
