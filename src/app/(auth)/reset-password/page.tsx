'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../hooks/use-toast";
import { captureError } from "../../../lib/sentry";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { z } from "zod";
import authLogo from "../../../../public/auth-logo.png";
import { BackgroundBeams } from "../../../components/ui/beams";

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    try {
      passwordSchema.parse({ password, confirmPassword });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      captureError(error, {
        source: "ResetPassword",
        action: "handleSubmit",
      });
      toast({
        title: "Password reset failed",
        description: error.message || "Unable to reset password",
        variant: "destructive",
      });
    } else {
      setSuccess(true);
      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset.",
      });
    }
  };

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: 'hsl(220, 40%, 13%)' }}>
      <BackgroundBeams className="absolute inset-0" />
      <div className="relative z-10 flex flex-col justify-between p-12 text-white">
        <Link href="/" className="flex items-center">
          <img src={authLogo.src} alt="Scamly" className="h-10 w-auto" />
        </Link>
        <div className="max-w-md" />
        <div className="flex items-center gap-4 text-sm text-white/60">
          <Link href="/privacy" className="hover:text-white/80 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white/80 transition-colors">Terms</Link>
          <span>&copy; {new Date().getFullYear()} Scamly</span>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen flex">
        {leftPanel}
        <div className="relative flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#5022f6' }}>
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Password Reset Complete</h2>
              <p className="text-muted-foreground mb-8">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <Button size="lg" className="text-white" style={{ backgroundColor: '#5022f6' }} onClick={() => router.push("/auth")}>
                Go to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {leftPanel}
      <div className="relative flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold mb-2">Set new password</h2>
              <p className="text-muted-foreground">Enter your new password below</p>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button size="lg" className="w-full mt-6 text-white" style={{ backgroundColor: '#5022f6' }} onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Reset Password
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
