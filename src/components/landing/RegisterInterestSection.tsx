import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, ArrowRight, CheckCircle } from 'lucide-react';

export function RegisterInterestSection() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // UI only - backend integration to follow
    setIsSubmitted(true);
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg opacity-5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 mb-6">
            <Bell className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Coming Soon to App Store & Google Play</span>
          </div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Be the First to{' '}
            <span className="gradient-text">Know</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Sign up to get notified when Scamly launches and receive exclusive early access.
          </p>
          
          {isSubmitted ? (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-display text-xl font-semibold">You're on the list!</h3>
              <p className="text-muted-foreground">
                We'll notify you as soon as Scamly is available for download.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <div className="w-full sm:flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={`h-12 ${error ? 'border-destructive' : ''}`}
                />
                {error && (
                  <p className="text-sm text-destructive mt-2 text-left">{error}</p>
                )}
              </div>
              <Button 
                type="submit"
                variant="gradient" 
                size="xl"
                className="w-full sm:w-auto"
              >
                Register Interest
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </form>
          )}

          <p className="text-sm text-muted-foreground mt-6">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
