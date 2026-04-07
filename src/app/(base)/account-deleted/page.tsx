import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import logoLight from "../../../../public/navbar-logo-light.png";

export const metadata: Metadata = {
  title: "Account Deleted | Scamly",
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <Link href="/" className="inline-block mb-4">
          <img
            src={logoLight.src}
            alt="Scamly"
            className="h-10 w-auto mx-auto"
          />
        </Link>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">Account Deleted</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your Scamly account has been permanently deleted and any active
            subscriptions have been cancelled with no further billing.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            A confirmation email has been sent to your email address.
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="mt-4 text-white"
          style={{ backgroundColor: "#5022f6" }}
        >
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
