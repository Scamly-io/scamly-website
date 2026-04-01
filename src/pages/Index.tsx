import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { MainDomainNavbar } from '@/components/MainDomainNavbar';
import { Footer } from '@/components/Footer';
import { MainDomainFooter } from '@/components/MainDomainFooter';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureShowcaseSection } from '@/components/landing/FeatureShowcase';
import { PricingSection } from '@/components/landing/PricingSection';
import { MainPricingSection } from '@/components/landing/MainPricingSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { CTASection } from '@/components/landing/CTASection';
import { RegisterInterestSection } from '@/components/landing/RegisterInterestSection';
import { trackPageVisited } from '@/lib/analytics';
import { isTestSubdomain } from '@/lib/subdomain';
import { LightRays } from '@/components/LightRays';

const Index = () => {
  useEffect(() => {
    trackPageVisited('home');
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50 to-sky-50">
      <LightRays />
      <Navbar />
      <AnnouncementBanner />
      <main>
        <HeroSection />
        <FeatureShowcaseSection />
        <PricingSection />
        <AboutSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
