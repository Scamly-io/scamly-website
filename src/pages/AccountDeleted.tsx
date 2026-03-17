import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import logoLight from "@/assets/navbar-logo-light.png";
import logoDark from "@/assets/navbar-logo-dark.png";

export default function AccountDeleted() {
  const { theme } = useTheme();

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Account Deleted | Scamly</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <Link to="/" className="inline-block mb-4">
            <img
              src={theme === "dark" ? logoDark : logoLight}
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
              Your Scamly account has been permanently deleted and any active subscriptions have been cancelled with no further billing.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A confirmation email has been sent to your email address.
            </p>
          </div>

          <Button asChild variant="gradient" size="lg" className="mt-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
