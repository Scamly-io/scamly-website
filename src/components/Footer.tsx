import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import logoLight from '@/assets/navbar-logo-light.png';
import logoDark from '@/assets/navbar-logo-dark.png';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { theme } = useTheme();

  const footerLinks = {
    product: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Download from App Store', href: 'https://apps.apple.com/app/id6759246327', external: true },
      { label: 'Download from Play Store', href: 'https://play.google.com/store/apps/details?id=io.scamly.app&hl=en', external: true },
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
                src={theme === 'dark' ? logoDark : logoLight} 
                alt="Scamly" 
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Protecting you from scams with AI-powered detection. Stay safe in the digital world.
            </p>
            <div className="flex gap-4">
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
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.disabled ? undefined : link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className={`text-sm text-muted-foreground transition-colors ${link.disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-foreground'}`}
                    onClick={link.disabled ? (e) => e.preventDefault() : undefined}
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
