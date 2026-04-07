import { AnnouncementBanner } from "../../components/AnnouncementBanner";
import { HeroSection } from "../../components/landing/HeroSection";
import { FeatureShowcaseSection } from "../../components/landing/FeatureShowcase";
import { GlobalCoverageSection } from "../../components/landing/GlobalCoverageSection";
import { AboutSection } from "../../components/landing/AboutSection";
import { CTASection } from "../../components/landing/CTASection";

export default function HomePage() {
  return (
    <>
      <AnnouncementBanner />
      <HeroSection />
      <FeatureShowcaseSection />
      <GlobalCoverageSection />
      <AboutSection />
      <CTASection />
    </>
  );
}
