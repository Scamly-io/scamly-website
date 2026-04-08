import { HomeAnnouncementStack } from "../../components/HomeAnnouncementStack";
import { FeatureShowcaseSection } from "../../components/landing/FeatureShowcase";
import { GlobalCoverageSection } from "../../components/landing/GlobalCoverageSection";
import { AboutSection } from "../../components/landing/AboutSection";
import { CTASection } from "../../components/landing/CTASection";

export default function HomePage() {
  return (
    <div className="pt-[calc(1rem+3.5rem+0.75rem)]">
      <HomeAnnouncementStack />
      <FeatureShowcaseSection />
      <GlobalCoverageSection />
      <AboutSection />
      <CTASection />
    </div>
  );
}
