import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Feature screenshots
import scanDark from '@/assets/features/scan-dark.png';
import scanLight from '@/assets/features/scan-light.png';
import chatDark from '@/assets/features/chat-dark.png';
import chatLight from '@/assets/features/chat-light.png';
import searchDark from '@/assets/features/search-dark.png';
import searchLight from '@/assets/features/search-light.png';
import libraryDark from '@/assets/features/library-dark.png';
import libraryLight from '@/assets/features/library-light.png';

interface FeatureShowcaseProps {
  title: string;
  subtitle: string;
  description: string;
  bulletPoints: string[];
  imageDark: string;
  imageLight: string;
  reverse?: boolean;
  badge?: string;
  badgeVariant?: 'premium' | 'beta';
}

function FeatureShowcase({
  title,
  subtitle,
  description,
  bulletPoints,
  imageDark,
  imageLight,
  reverse = false,
  badge,
  badgeVariant = 'premium',
}: FeatureShowcaseProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const currentImage = theme === 'dark' ? imageDark : imageLight;

  return (
    <div
      ref={ref}
      className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
    >
      {/* Screenshot */}
      <div
        className={`flex-1 flex justify-center transition-all duration-700 ${
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Screenshot */}
          <img
            src={currentImage}
            alt={title}
            className="relative w-[280px] sm:w-[320px] transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 text-center lg:text-left transition-all duration-700 delay-200 ${
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        {/* Subtitle */}
        <span className="text-sm font-semibold uppercase tracking-wider text-secondary mb-2 block">
          {subtitle}
        </span>

        {/* Title with badge */}
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
          <h3 className="font-display text-3xl md:text-4xl font-bold">
            {title}
          </h3>
          {badge && (
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                badgeVariant === 'beta'
                  ? 'bg-orange-500/20 text-orange-500 dark:bg-orange-400/20 dark:text-orange-400 border border-orange-500/30'
                  : 'gradient-bg text-primary-foreground'
              }`}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-lg text-muted-foreground mb-6 max-w-lg mx-auto lg:mx-0">
          {description}
        </p>

        {/* Bullet points */}
        <ul className="space-y-3">
          {bulletPoints.map((point, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-left"
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full gradient-bg flex items-center justify-center mt-0.5">
                <svg
                  className="w-3.5 h-3.5 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-foreground/90">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Feature data
const features = [
  {
    title: 'AI Scam Scanner',
    subtitle: 'Instant Protection',
    description:
      'Upload screenshots of suspicious messages, emails, or social media posts. Our AI analyzes content patterns and provides instant risk assessments with actionable advice.',
    bulletPoints: [
      'Analyzes texts, emails, and social media messages',
      'Instant confidence score with risk level',
      'Clear recommendations on next steps',
      'Works with screenshots in any language',
    ],
    imageDark: scanDark,
    imageLight: scanLight,
  },
  {
    title: 'AI Chat Assistant',
    subtitle: 'Expert Knowledge',
    description:
      'Have natural conversations about scams, fraud, and cybersecurity. Get personalized answers to complex questions and learn how to stay protected.',
    bulletPoints: [
      'Ask anything about scams and fraud',
      'Get expert-level answers instantly',
      'Learn about new and emerging threats',
      'Receive personalized safety recommendations',
    ],
    imageDark: chatDark,
    imageLight: chatLight,
    badge: 'Premium',
  },
  {
    title: 'Contact Search',
    subtitle: 'Verify Before You Trust',
    description:
      'Powered by Perplexity AI, find legitimate contact information for any company worldwide. Never fall for fake customer service scams again.',
    bulletPoints: [
      'Search any company or organization',
      'Get verified contact details instantly',
      'Find official websites and phone numbers',
      'Avoid fake customer service scams',
    ],
    imageDark: searchDark,
    imageLight: searchLight,
    badge: 'Beta',
    badgeVariant: 'beta' as const,
  },
  {
    title: 'Learning Library',
    subtitle: 'Stay Informed',
    description:
      'Access a comprehensive library of articles, guides, and tips about scam types, prevention strategies, and online safety best practices.',
    bulletPoints: [
      'In-depth articles on scam types',
      'Step-by-step prevention guides',
      'Regular updates on new threats',
      'Expert tips for staying safe online',
    ],
    imageDark: libraryDark,
    imageLight: libraryLight,
  },
];

export function FeatureShowcaseSection() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-hero-pattern opacity-30" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 mb-6">
            <svg
              className="w-4 h-4 text-secondary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to{' '}
            <span className="gradient-text">Stay Safe</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Scamly combines cutting-edge AI with practical tools to protect you
            from the ever-evolving landscape of online fraud.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-32">
          {features.map((feature, index) => (
            <FeatureShowcase
              key={feature.title}
              {...feature}
              reverse={index % 2 === 1}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { value: '99%', label: 'Detection Accuracy' },
            { value: '50K+', label: 'Scans Completed' },
            { value: '24/7', label: 'AI Protection' },
            { value: '150+', label: 'Countries Covered' },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <p className="font-display text-3xl md:text-4xl font-bold gradient-text mb-1 transition-transform duration-300 group-hover:scale-110">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
