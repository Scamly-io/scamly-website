import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Mail, CheckCircle } from "lucide-react";
import authLogo from "../../public/auth-logo.png";
import { BackgroundBeams } from "../components/ui/beams";

export default function CheckEmail() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: 'hsl(220, 40%, 13%)' }}>
        <BackgroundBeams className="absolute inset-0" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center">
            <img src={authLogo.src} alt="Scamly" className="h-10 w-auto" />
          </Link>

          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold mb-4">You're almost there!</h1>
            <p className="text-white/80 text-lg">
              Just one more step to start protecting yourself from fraud and phishing attempts.
            </p>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Scamly. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8" style={{ backgroundColor: '#5022f6' }}>
              <Mail className="w-10 h-10 text-white" />
            </div>

            {/* Heading */}
            <h1 className="font-display text-3xl font-bold mb-4">Check your email</h1>
            
            {/* Description */}
            <p className="text-muted-foreground text-lg mb-8">
              We've sent a verification link to your email address. Please click the link to verify your account and complete your registration.
            </p>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm mb-1">It's safe to close this page</p>
                  <p className="text-sm text-muted-foreground">
                    You can close this browser tab now. Once you verify your email, you can sign in from any device.
                  </p>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <p className="text-sm text-muted-foreground mb-6">
              Didn't receive an email? Check your spam folder or{" "}
              <Link to="/auth" className="text-primary hover:underline">
                try signing up again
              </Link>.
            </p>

            {/* Back to Sign In */}
            <Link to="/auth">
              <Button variant="outline" size="lg">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
