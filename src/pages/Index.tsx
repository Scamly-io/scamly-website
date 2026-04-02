import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { MainDomainNavbar } from '@/components/MainDomainNavbar';
import { Footer } from '@/components/Footer';
import { MainDomainFooter } from '@/components/MainDomainFooter';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureShowcaseSection } from '@/components/landing/FeatureShowcase';
import { GlobalCoverageSection } from '@/components/landing/GlobalCoverageSection';

import { MainPricingSection } from '@/components/landing/MainPricingSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { CTASection } from '@/components/landing/CTASection';
import { RegisterInterestSection } from '@/components/landing/RegisterInterestSection';
import { trackPageVisited } from '@/lib/analytics';
import { isTestSubdomain } from '@/lib/subdomain';

const Index = () => {
  useEffect(() => {
    trackPageVisited('home');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden">
      {/* Bottom page gradient glow — same as hero */}
      <div className="absolute bottom-0 left-0 right-0 h-[60vh] overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[80%] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(ellipse at 30% 20%, #fff7ed 0%, #fef3c7 35%, #f5f3ff 65%, transparent 100%)",
            animation: "heroGlow 12s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute top-1/4 left-1/3 w-[100%] h-[60%] rounded-full opacity-80 blur-3xl"
          style={{
            background: "radial-gradient(ellipse at 70% 30%, #f5f3ff 0%, #fdf2f8 40%, #fff7ed 80%, transparent 100%)",
            animation: "heroGlow 12s ease-in-out 4s infinite alternate-reverse",
          }}
        />
        <div
          className="absolute top-1/4 right-1/4 w-[80%] h-[50%] rounded-full opacity-65 blur-3xl"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, #fdf2f8 0%, #f5f3ff 50%, #fff7ed 100%)",
            animation: "heroGlow 12s ease-in-out 8s infinite alternate",
          }}
        />
      </div>
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
