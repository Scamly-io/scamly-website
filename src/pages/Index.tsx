import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureShowcaseSection } from '@/components/landing/FeatureShowcase';
import { PricingSection } from '@/components/landing/PricingSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { CTASection } from '@/components/landing/CTASection';
import { trackPageVisited } from '@/lib/analytics';

const Index = () => {
  // Track page visit when user lands on home page
  useEffect(() => {
    trackPageVisited('home');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
