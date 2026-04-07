import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { GradientBackground } from "../../components/GradientBackground";

function AuthFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-zinc-50">
      <GradientBackground />
      <div className="relative z-10">
        <Suspense fallback={<AuthFallback />}>{children}</Suspense>
      </div>
    </div>
  );
}
