import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Sparkles, ArrowRight, Check } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center hero-gradient overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-hero-pattern opacity-50" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">AI-Powered Scam Detection</span>
          </div>
          
          {/* Heading */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Protect Yourself from{' '}
            <span className="gradient-text">Online Scams</span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Scamly uses specialized AI to instantly detect scams in text messages, emails, and social media. Screenshot, scan, and stay safe.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="gradient" size="xl" asChild>
              <Link to="/auth?mode=signup">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </div>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>6 free scans monthly</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
        
        {/* Hero Visual */}
        <div className="mt-16 relative animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="relative mx-auto max-w-4xl">
            {/* Glow Effect */}
            <div className="absolute inset-0 gradient-bg rounded-3xl blur-3xl opacity-20" />
            
            {/* Card */}
            <div className="relative glass rounded-3xl p-8 border border-border/50 card-shadow">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Left - Phone Mockup */}
                <div className="flex-1 flex justify-center">
                  <div className="relative">
                    <div className="w-64 h-[500px] bg-gradient-to-br from-card to-muted rounded-[3rem] p-3 shadow-2xl">
                      <div className="w-full h-full bg-card rounded-[2.5rem] overflow-hidden flex flex-col">
                        {/* Phone Header */}
                        <div className="gradient-bg px-6 py-8 text-center">
                          <Shield className="w-12 h-12 mx-auto text-primary-foreground mb-2" />
                          <h3 className="text-primary-foreground font-display font-bold text-lg">Scamly</h3>
                          <p className="text-primary-foreground/80 text-sm">Scan Complete</p>
                        </div>
                        
                        {/* Result Card */}
                        <div className="flex-1 p-4 bg-card">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-green-600 dark:text-green-400">Safe</p>
                                <p className="text-xs text-muted-foreground">98% Confidence</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This message appears to be legitimate with no signs of phishing or fraud.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="h-3 bg-muted rounded-full w-full" />
                            <div className="h-3 bg-muted rounded-full w-4/5" />
                            <div className="h-3 bg-muted rounded-full w-3/5" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute -top-4 -right-4 w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center shadow-lg animate-float">
                      <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                
                {/* Right - Features List */}
                <div className="flex-1 text-left">
                  <h3 className="font-display text-2xl font-bold mb-6">
                    How Scamly Works
                  </h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', title: 'Screenshot', desc: 'Capture any suspicious message or content' },
                      { step: '2', title: 'Upload', desc: 'Share it with Scamly in seconds' },
                      { step: '3', title: 'Analyze', desc: 'Our AI scans for scam indicators' },
                      { step: '4', title: 'Results', desc: 'Get a detailed breakdown instantly' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <h4 className="font-semibold">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
