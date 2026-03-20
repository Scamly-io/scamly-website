import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Toggle this to show/hide the banner site-wide
const BANNER_ENABLED = true;

const BANNER_MESSAGE =
  "Scamly is temporarily unavailable on the Google Play Store. We're working to resolve this as soon as possible. We apologise for the inconvenience.";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!BANNER_ENABLED || dismissed) return null;

  return (
    <div className="relative z-40 bg-destructive/10 border-b border-destructive/20 text-destructive-foreground">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <p className="text-center text-foreground/90 font-medium">{BANNER_MESSAGE}</p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-full hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
