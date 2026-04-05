import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroGradientBackground } from "@/components/HeroGradientBackground";

export default function PortalOnboardingComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get("ref");

  if (ref === "web") {
    return (
      <div className="relative min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-6 p-6">
        <HeroGradientBackground />
        <CheckCircle className="relative z-10 w-12 h-12 text-primary" />
        <div className="relative z-10 text-center space-y-2">
          <h1 className="text-2xl font-bold font-display">You're all set!</h1>
          <p className="text-muted-foreground">Your account has been set up successfully.</p>
        </div>
        <Button className="relative z-10 text-white" style={{ backgroundColor: '#5022f6' }} size="lg" onClick={() => navigate("/portal")}>
          Go to Portal
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
      <HeroGradientBackground />
      <Loader2 className="relative z-10 w-10 h-10 animate-spin text-primary" />
      <p className="relative z-10 text-muted-foreground text-sm">Setting up your account...</p>
    </div>
  );
}
