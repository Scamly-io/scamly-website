import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram } from 'lucide-react';
import logoLight from '@/assets/navbar-logo-light.png';
import appStoreBadge from '@/assets/badge-app-store.png';
import googlePlayBadge from '@/assets/badge-google-play.png';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
    ],
    support: [
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center mb-4">
              <img 
                src={logoLight} 
                alt="Scamly" 
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Protecting you from scams with AI-powered detection. Stay safe in the digital world.
            </p>
            <div className="flex gap-4 mb-6">
              <a href="https://x.com/scamly_io" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61575897879294" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/scamly.io/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
            <div className="flex gap-3">
              <a href="https://apps.apple.com/app/id6759246327" target="_blank" rel="noopener noreferrer">
                <img src={appStoreBadge} alt="Download on the App Store" className="h-10 w-auto" />
              </a>
              <a href="https://play.google.com/store/apps/details?id=io.scamly.app&hl=en" target="_blank" rel="noopener noreferrer">
                <img src={googlePlayBadge} alt="Get it on Google Play" className="h-10 w-auto" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Scamly Pty Ltd. All rights reserved. ABN 55 695 941 532
          </p>
          <p className="text-sm text-muted-foreground">
            Made with purpose. Designed to protect.
          </p>
        </div>
      </div>
    </footer>
  );
}
