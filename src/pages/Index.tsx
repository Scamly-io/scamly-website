import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { MainDomainNavbar } from '@/components/MainDomainNavbar';
import { Footer } from '@/components/Footer';
import { MainDomainFooter } from '@/components/MainDomainFooter';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureShowcaseSection } from '@/components/landing/FeatureShowcase';
import { PricingSection } from '@/components/landing/PricingSection';
import { MainPricingSection } from '@/components/landing/MainPricingSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { CTASection } from '@/components/landing/CTASection';
import { RegisterInterestSection } from '@/components/landing/RegisterInterestSection';
import { trackPageVisited } from '@/lib/analytics';
import { isTestSubdomain } from '@/lib/subdomain';

const Index = () => {
  const isTest = isTestSubdomain();

  // Track page visit when user lands on home page
  useEffect(() => {
    trackPageVisited('home');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {isTest ? <Navbar /> : <MainDomainNavbar />}
      <main>
        <HeroSection />
        <FeatureShowcaseSection />
        {isTest ? <PricingSection /> : <MainPricingSection />}
        <AboutSection />
        {isTest ? <CTASection /> : <RegisterInterestSection />}
      </main>
      {isTest ? <Footer /> : <MainDomainFooter />}
    </div>
  );
};

export default Index;
