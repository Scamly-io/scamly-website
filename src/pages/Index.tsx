import { useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { AnnouncementBanner } from "../components/AnnouncementBanner";
import { HeroSection } from "../components/landing/HeroSection";
import { FeatureShowcaseSection } from "../components/landing/FeatureShowcase";
import { GlobalCoverageSection } from "../components/landing/GlobalCoverageSection";
import { AboutSection } from "../components/landing/AboutSection";
import { CTASection } from "../components/landing/CTASection";
import { trackPageVisited } from "../lib/analytics";

const Index = () => {
  useEffect(() => {
    trackPageVisited("home");
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <AnnouncementBanner />
      <main>
        <HeroSection />
        <FeatureShowcaseSection />
        <GlobalCoverageSection />

        <AboutSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
