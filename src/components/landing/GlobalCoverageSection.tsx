import { useEffect, useRef, useState } from "react";
import WorldMap from "@/components/ui/world-map";
import { Globe, ShieldCheck } from "lucide-react";

const mapDots = [
  {
    start: { lat: -33.8688, lng: 151.2093 }, // Sydney
    end: { lat: 51.5074, lng: -0.1278 }, // London
  },
  {
    start: { lat: 51.5074, lng: -0.1278 }, // London
    end: { lat: 40.7128, lng: -74.006 }, // New York
  },
  {
    start: { lat: 35.6762, lng: 139.6503 }, // Tokyo
    end: { lat: 28.6139, lng: 77.209 }, // New Delhi
  },
  {
    start: { lat: 28.6139, lng: 77.209 }, // New Delhi
    end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
  },
  {
    start: { lat: -15.7975, lng: -47.8919 }, // Brasília
    end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
  },
  {
    start: { lat: 1.3521, lng: 103.8198 }, // Singapore
    end: { lat: -33.8688, lng: 151.2093 }, // Sydney
  },
];

export function GlobalCoverageSection() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: "rgb(13, 23, 48)" }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left – Text */}
          <div className="lg:w-5/12 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sky-300 text-sm font-medium mb-6">
              <Globe className="w-4 h-4" />
              Global Protection
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Scam Protection That Works{" "}
              <span className="text-sky-400">Everywhere</span>
            </h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Scams don't respect borders — and neither does Scamly. Our AI is
              trained on global fraud patterns, so whether you're in Sydney,
              London, or São Paulo, you get the same powerful protection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-200 text-sm">
                  170+ countries covered
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-200 text-sm">
                  Multilingual scam detection
                </span>
              </div>
            </div>
          </div>

          {/* Right – World Map */}
          <div className="lg:w-7/12 w-full">
            <WorldMap dots={mapDots} lineColor="#38bdf8" />
          </div>
        </div>
      </div>
    </section>
  );
}
