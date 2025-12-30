import { 
  Scan, 
  MessageCircle, 
  Search, 
  BookOpen, 
  Shield,
  Sparkles 
} from 'lucide-react';

const features = [
  {
    icon: Scan,
    title: 'AI Scam Scanner',
    description: 'Upload screenshots of suspicious messages, emails, or social media posts. Our AI analyzes content for scam patterns with high accuracy.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageCircle,
    title: 'AI Chat Assistant',
    description: 'Ask complex questions about scams and get expert-level answers. Perfect for understanding new threats and staying informed.',
    gradient: 'from-primary to-secondary',
    premium: true,
  },
  {
    icon: Search,
    title: 'Contact Search',
    description: 'Powered by Perplexity AI, find legitimate contact info for any company worldwide. Verify before you trust.',
    gradient: 'from-orange-500 to-red-500',
    premium: true,
  },
  {
    icon: BookOpen,
    title: 'Learning Library',
    description: 'Access articles, guides, and tips about scam types, prevention strategies, and online safety best practices.',
    gradient: 'from-green-500 to-emerald-500',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-pattern opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 mb-6">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to{' '}
            <span className="gradient-text">Stay Safe</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Scamly combines cutting-edge AI with practical tools to protect you from the ever-evolving landscape of online fraud.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card group relative overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Gradient Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
              
              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                
                {/* Title + Premium Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-display text-xl font-bold">{feature.title}</h3>
                  {feature.premium && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full gradient-bg text-primary-foreground">
                      Premium
                    </span>
                  )}
                </div>
                
                {/* Description */}
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { value: '99%', label: 'Detection Accuracy' },
            { value: '50K+', label: 'Scans Completed' },
            { value: '24/7', label: 'AI Protection' },
            { value: '150+', label: 'Countries Covered' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl md:text-4xl font-bold gradient-text mb-1">
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
