import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sparkles } from 'lucide-react';

// Import all feature images
import scanDark from '@/assets/features/scan-dark.png';
import scanLight from '@/assets/features/scan-light.png';
import chatDark from '@/assets/features/chat-dark.png';
import chatLight from '@/assets/features/chat-light.png';
import searchDark from '@/assets/features/search-dark.png';
import searchLight from '@/assets/features/search-light.png';
import libraryDark from '@/assets/features/library-dark.png';
import libraryLight from '@/assets/features/library-light.png';

interface Feature {
  id: string;
  title: string;
  description: string;
  imageDark: string;
  imageLight: string;
  badge?: string;
}

const features: Feature[] = [
  {
    id: 'scan',
    title: "Use AI to scan online media for scams",
    description: "Scamly can help you detect scams before they happen. All you have to do is screenshot and scan",
    imageDark: scanDark,
    imageLight: scanLight,
  },
  {
    id: 'chat',
    title: "Ask complex questions about scams",
    description: "Get clear answers to any question about scams from Scamly's advanced, specialised AI",
    imageDark: chatDark,
    imageLight: chatLight,
  },
  {
    id: 'search',
    title: "Search for contact information",
    description: "Find contact information for any company worldwide",
    imageDark: searchDark,
    imageLight: searchLight,
    badge: "Beta",
  },
  {
    id: 'library',
    title: "Read all about how scammers operate",
    description: "The Scamly Library is full of quick tips and detailed articles on how to avoid scams",
    imageDark: libraryDark,
    imageLight: libraryLight,
  },
];

// Mobile feature card component
function MobileFeatureCard({ feature, theme }: { feature: Feature; theme: string }) {
  const image = theme === 'dark' ? feature.imageDark : feature.imageLight;
  
  return (
    <div className="flex flex-col gap-6 py-12 border-b border-border/30 last:border-b-0">
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-2xl font-bold">{feature.title}</h3>
          {feature.badge && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-secondary/20 text-secondary border border-secondary/30">
              {feature.badge}
            </span>
          )}
        </div>
        <p className="text-muted-foreground">{feature.description}</p>
      </div>
      <div className="relative flex justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-secondary/10 blur-3xl opacity-30" />
        <img
          src={image}
          alt={feature.title}
          className="relative z-10 w-full max-w-[280px] rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
}

// Desktop sticky scroll feature display
function DesktopStickyFeatures({ theme }: { theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth spring animation for scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  return (
    <div ref={containerRef} className="relative h-[400vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10 h-full flex flex-col">
          {/* Section Header */}
          <div className="flex justify-center pt-8 pb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium">Powerful Features</span>
            </div>
          </div>
          
          {/* Main content - 3 column layout */}
          <div className="flex-1 grid grid-cols-12 gap-8 items-center">
            {/* Left text column */}
            <div className="col-span-3 relative h-32">
              {features.map((feature, index) => (
                <FeatureTitle
                  key={feature.id}
                  feature={feature}
                  index={index}
                  smoothProgress={smoothProgress}
                />
              ))}
            </div>
            
            {/* Center image column */}
            <div className="col-span-6 flex justify-center items-center">
              <div className="relative w-full max-w-[350px] aspect-[9/16]">
                {/* Glow effect behind phone */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-secondary/20 blur-3xl scale-110 opacity-50" />
                
                {/* Phone images */}
                {features.map((feature, index) => (
                  <FeatureImage
                    key={feature.id}
                    feature={feature}
                    index={index}
                    theme={theme}
                    smoothProgress={smoothProgress}
                  />
                ))}
              </div>
            </div>
            
            {/* Right text column */}
            <div className="col-span-3 relative h-32">
              {features.map((feature, index) => (
                <FeatureDescription
                  key={feature.id}
                  feature={feature}
                  index={index}
                  smoothProgress={smoothProgress}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature title component with scroll-driven animation
function FeatureTitle({ 
  feature, 
  index, 
  smoothProgress 
}: { 
  feature: Feature; 
  index: number; 
  smoothProgress: MotionValue<number>;
}) {
  const totalFeatures = features.length;
  const segmentSize = 1 / totalFeatures;
  
  // Dead zone configuration
  const deadZone = 0.03;
  
  // Calculate enter/exit points
  const enterStart = index === 0 ? 0 : index * segmentSize + deadZone;
  const enterEnd = enterStart + segmentSize * 0.2;
  const exitStart = (index + 1) * segmentSize - segmentSize * 0.2;
  const exitEnd = (index + 1) * segmentSize;
  
  const isFirst = index === 0;
  const isLast = index === totalFeatures - 1;
  
  // First feature starts visible
  const y = useTransform(
    smoothProgress,
    isFirst
      ? (isLast ? [0, 1] : [exitStart, exitEnd])
      : (isLast ? [enterStart, enterEnd] : [enterStart, enterEnd, exitStart, exitEnd]),
    isFirst
      ? (isLast ? [0, 0] : [0, -25])
      : (isLast ? [25, 0] : [25, 0, 0, -25])
  );
  
  const opacity = useTransform(
    smoothProgress,
    isFirst
      ? (isLast ? [0, 1] : [exitStart, exitEnd])
      : (isLast ? [enterStart, enterEnd] : [enterStart, enterEnd, exitStart, exitEnd]),
    isFirst
      ? (isLast ? [1, 1] : [1, 0])
      : (isLast ? [0, 1] : [0, 1, 1, 0])
  );

  return (
    <motion.div
      style={{ y, opacity }}
      className="absolute inset-0 flex items-center"
    >
      <div className="flex items-start gap-2 flex-wrap">
        <h3 className="font-display text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight">
          {feature.title}
        </h3>
        {feature.badge && (
          <span className="mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-secondary/20 text-secondary border border-secondary/30 whitespace-nowrap">
            {feature.badge}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Feature description component with scroll-driven animation (slightly delayed)
function FeatureDescription({ 
  feature, 
  index, 
  smoothProgress 
}: { 
  feature: Feature; 
  index: number; 
  smoothProgress: MotionValue<number>;
}) {
  const totalFeatures = features.length;
  const segmentSize = 1 / totalFeatures;
  
  // Dead zone + stagger delay
  const deadZone = 0.03;
  const stagger = 0.02;
  
  const enterStart = index === 0 ? stagger : index * segmentSize + deadZone + stagger;
  const enterEnd = enterStart + segmentSize * 0.2;
  const exitStart = (index + 1) * segmentSize - segmentSize * 0.2 - stagger;
  const exitEnd = (index + 1) * segmentSize - stagger;
  
  const isFirst = index === 0;
  const isLast = index === totalFeatures - 1;
  
  const y = useTransform(
    smoothProgress,
    isFirst
      ? (isLast ? [0, 1] : [exitStart, exitEnd])
      : (isLast ? [enterStart, enterEnd] : [enterStart, enterEnd, exitStart, exitEnd]),
    isFirst
      ? (isLast ? [0, 0] : [0, -25])
      : (isLast ? [25, 0] : [25, 0, 0, -25])
  );
  
  const opacity = useTransform(
    smoothProgress,
    isFirst
      ? (isLast ? [0, 1] : [exitStart, exitEnd])
      : (isLast ? [enterStart, enterEnd] : [enterStart, enterEnd, exitStart, exitEnd]),
    isFirst
      ? (isLast ? [1, 1] : [1, 0])
      : (isLast ? [0, 1] : [0, 1, 1, 0])
  );

  return (
    <motion.div
      style={{ y, opacity }}
      className="absolute inset-0 flex items-center"
    >
      <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

// Feature image component with scroll-driven animation
function FeatureImage({ 
  feature, 
  index, 
  theme,
  smoothProgress 
}: { 
  feature: Feature; 
  index: number;
  theme: string;
  smoothProgress: MotionValue<number>;
}) {
  const image = theme === 'dark' ? feature.imageDark : feature.imageLight;
  const totalFeatures = features.length;
  const segmentSize = 1 / totalFeatures;
  
  const deadZone = 0.03;
  
  const enterStart = index === 0 ? 0 : index * segmentSize + deadZone;
  const enterEnd = enterStart + segmentSize * 0.15;
  const exitStart = (index + 1) * segmentSize - segmentSize * 0.15;
  const exitEnd = (index + 1) * segmentSize;
  
  const isFirst = index === 0;
  const isLast = index === totalFeatures - 1;
  
  // First image scales up from 0.9, starts visible
  const scale = useTransform(
    smoothProgress,
    isFirst ? [0, 0.05] : [enterStart, enterEnd],
    isFirst ? [0.9, 1] : [1, 1]
  );
  
  const opacity = useTransform(
    smoothProgress,
    isFirst
      ? (isLast ? [0, 1] : [exitStart, exitEnd])
      : (isLast ? [enterStart, enterEnd] : [enterStart, enterEnd, exitStart, exitEnd]),
    isFirst
      ? (isLast ? [1, 1] : [1, 0])
      : (isLast ? [0, 1] : [0, 1, 1, 0])
  );

  return (
    <motion.img
      src={image}
      alt={feature.title}
      style={{ scale, opacity }}
      className="absolute inset-0 w-full h-full object-contain rounded-2xl shadow-2xl"
    />
  );
}

export function StickyFeaturesSection() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  
  // Mobile layout - simple vertical stack
  if (isMobile) {
    return (
      <section id="features" className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 mb-6">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium">Powerful Features</span>
            </div>
            <h2 className="font-display text-3xl font-bold mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Stay Safe</span>
            </h2>
          </div>
          
          {/* Mobile features list */}
          <div className="space-y-0">
            {features.map((feature) => (
              <MobileFeatureCard 
                key={feature.id} 
                feature={feature} 
                theme={theme} 
              />
            ))}
          </div>
        </div>
      </section>
    );
  }
  
  // Desktop/Tablet - sticky scroll experience
  return (
    <section id="features" className="relative overflow-hidden">
      <DesktopStickyFeatures theme={theme} />
    </section>
  );
}
