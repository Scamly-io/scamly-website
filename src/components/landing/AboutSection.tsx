import { Shield, Target, Users } from 'lucide-react';

export function AboutSection() {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Story */}
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              Built by Experts,{' '}
              <span className="gradient-text">For Everyone</span>
            </h2>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                Scamly was founded by a cybersecurity professional with extensive experience in scam defense and software development. After years of watching people fall victim to increasingly sophisticated online fraud, one thing became clear: <strong className="text-foreground">not enough was being done to stop scams.</strong>
              </p>
              <p>
                Traditional security tools focus on protecting systems, not people. Scamly flips the script by putting powerful AI-driven detection directly in your hands. Whether it's a suspicious text message, a too-good-to-be-true email, or a sketchy social media post — Scamly helps you verify before you trust.
              </p>
              <p>
                Our mission is simple: make scam detection accessible to everyone, everywhere. Because staying safe online shouldn't require a degree in cybersecurity.
              </p>
            </div>
          </div>
          
          {/* Right - Values */}
          <div className="space-y-6">
            {[
              {
                icon: Shield,
                title: 'Protection First',
                description: 'Every feature we build starts with one question: how does this help protect our users?',
              },
              {
                icon: Target,
                title: 'Accuracy Matters',
                description: 'Our AI is trained on millions of real scam examples to deliver reliable, actionable results.',
              },
              {
                icon: Users,
                title: 'For Everyone',
                description: "Whether you're tech-savvy or not, Scamly is designed to be simple, fast, and effective.",
              },
            ].map((value) => (
              <div key={value.title} className="feature-card flex gap-4">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <value.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
