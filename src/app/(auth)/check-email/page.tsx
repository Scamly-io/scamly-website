'use client'

import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Mail, CheckCircle } from "lucide-react";
import authLogo from "../../../../public/auth-logo.png";
import { BackgroundBeams } from "../../../components/ui/beams";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: 'hsl(220, 40%, 13%)' }}>
        <BackgroundBeams className="absolute inset-0" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center">
            <img src={authLogo.src} alt="Scamly" className="h-10 w-auto" />
          </Link>

          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold mb-4">You&apos;re almost there!</h1>
            <p className="text-white/80 text-lg">
              Just one more step to start protecting yourself from fraud and phishing attempts.
            </p>
          </div>

          <p className="text-sm text-white/60">
            &copy; {new Date().getFullYear()} Scamly. All rights reserved.
          </p>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col">
        <div className="relative z-10 flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8" style={{ backgroundColor: '#5022f6' }}>
              <Mail className="w-10 h-10 text-white" />
            </div>

            <h1 className="font-display text-3xl font-bold mb-4">Check your email</h1>

            <p className="text-muted-foreground text-lg mb-8">
              We&apos;ve sent a verification link to your email address. Please click the link to verify your account and complete your registration.
            </p>

            <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm mb-1">It&apos;s safe to close this page</p>
                  <p className="text-sm text-muted-foreground">
                    You can close this browser tab now. Once you verify your email, you can sign in from any device.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Didn&apos;t receive an email? Check your spam folder or{" "}
              <Link href="/auth" className="text-primary hover:underline">
                try signing up again
              </Link>.
            </p>

            <Link href="/auth">
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
