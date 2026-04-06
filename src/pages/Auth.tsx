import { useState, useEffect } from "react";
import authLogo from "@/assets/auth-logo.png";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";
import { captureError } from "@/lib/sentry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackgroundBeams } from "@/components/ui/beams";

import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Calendar, MapPin, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { z } from "zod";
import { countries } from "@/constants/countries";
import { trackSignupCompleted } from "@/lib/analytics";
import { CountryWhyCollected } from "@/components/CountryWhyCollected";
import { getBrowserMetadata } from "@/lib/browser-metadata";

const referralSourceOptions = [
  "Facebook",
  "Instagram",
  "X (Twitter)",
  "Youtube",
  "Other social media",
  "Google search",
  "Word of Mouth",
  "Other",
];


const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(50, "First name is too long"),
  dob: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    const parts = val.split("/");
    if (parts.length !== 3) return false;
    const [dd, mm, yyyy] = parts.map(Number);
    const date = new Date(yyyy, mm - 1, dd);
    return date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd && yyyy >= 1900 && yyyy <= new Date().getFullYear();
  }, "Please enter a valid date in dd/mm/yyyy format"),
  country: z.string().min(1, "Country is required"),
  gender: z.string().optional(),
  referralSource: z.string().min(1, "Please select how you heard about us"),
});

const genders = ["Male", "Female", "Prefer not to say"];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword } = useAuth();
  
  const { toast } = useToast();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [referralSource, setReferralSource] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get referral code from URL if present
  const referralCodeFromUrl = searchParams.get("ref");

  useEffect(() => {
    if (user) {
      // Pass referral code to portal if present
      const portalUrl = referralCodeFromUrl 
        ? `/portal?ref=${referralCodeFromUrl}` 
        : "/portal";
      navigate(portalUrl);
    }
  }, [user, navigate, referralCodeFromUrl]);

  useEffect(() => {
    setMode(searchParams.get("mode") === "signup" ? "signup" : "signin");
  }, [searchParams]);

  const validateStep1 = () => {
    try {
      if (mode === "signin") {
        signInSchema.parse({ email, password });
      } else {
        z.object({
          email: z.string().email("Please enter a valid email address"),
          password: z.string().min(8, "Password must be at least 8 characters"),
        }).parse({ email, password });
      }
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

  const validateStep2 = () => {
    try {
      z.object({
        firstName: z.string().min(1, "First name is required").max(50, "First name is too long"),
        dob: z.string().optional().refine((val) => {
          if (!val || val.trim() === "") return true;
          const parts = val.split("/");
          if (parts.length !== 3) return false;
          const [dd, mm, yyyy] = parts.map(Number);
          const date = new Date(yyyy, mm - 1, dd);
          return date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd && yyyy >= 1900 && yyyy <= new Date().getFullYear();
        }, "Please enter a valid date in dd/mm/yyyy format"),
        country: z.string().min(1, "Country is required"),
        gender: z.string().optional(),
        referralSource: z.string().min(1, "Please select how you heard about us"),
      }).parse({ firstName, dob: dob || undefined, country, gender: gender || undefined, referralSource });
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

  const handleSignIn = async () => {
    if (!validateStep1()) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      // Only log non-credential errors (wrong password is expected user error)
      if (!error.message?.toLowerCase().includes("invalid") && 
          !error.message?.toLowerCase().includes("credentials")) {
        captureError(error, {
          source: "Auth",
          action: "handleSignIn",
        });
      }
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate("/portal");
    }
  };

  const handleSignUp = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    // Convert dd/mm/yyyy to yyyy-mm-dd for storage
    let isoDate: string | null = null;
    if (dob && dob.trim() !== "") {
      const dobParts = dob.split("/");
      isoDate = dobParts.length === 3 ? `${dobParts[2]}-${dobParts[1]}-${dobParts[0]}` : dob;
    }

    // Gather browser metadata (fbp, fbq, ip, user agent)
    const browserMeta = await getBrowserMetadata();

    const { error } = await signUp(email, password, {
      first_name: firstName,
      ...(isoDate ? { dob: isoDate } : {}),
      country,
      ...(gender ? { gender } : {}),
      referral_source: referralSource,
      ...browserMeta,
    });
    setLoading(false);

    if (error) {
      if (error.message?.includes("already registered")) {
        // Expected error - user already exists
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
        });
        setMode("signin");
        setStep(1);
      } else {
        // Unexpected signup error - log to Sentry
        captureError(error, {
          source: "Auth",
          action: "handleSignUp",
        });
        toast({
          title: "Sign up failed",
          description: error.message || "Unable to create account",
          variant: "destructive",
        });
      }
    } else {
      // Track successful signup completion
      trackSignupCompleted();
      
      // Redirect to check email page
      navigate("/check-email");
    }
  };

  const handleForgotPassword = async () => {
    try {
      z.string().email("Please enter a valid email address").parse(email);
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors({ email: err.errors[0].message });
      }
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      captureError(error, {
        source: "Auth",
        action: "handleForgotPassword",
      });
      toast({
        title: "Failed to send reset email",
        description: error.message || "Unable to send password reset email",
        variant: "destructive",
      });
    } else {
      setForgotEmailSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    }
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: 'hsl(220, 40%, 13%)' }}>
        <BackgroundBeams />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center">
            <img src={authLogo} alt="Scamly" className="h-10 w-auto" />
          </Link>

          <div className="max-w-md" />

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Scamly. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 lg:p-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Back Button (for step 2 or forgot password) */}
            {(mode === "signup" && step === 2) || mode === "forgot" ? (
              <button
                onClick={() => {
                  if (mode === "forgot") {
                    setMode("signin");
                    setForgotEmailSent(false);
                  } else {
                    setStep(1);
                  }
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : null}

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold mb-2">
                {mode === "signin" 
                  ? "Welcome back" 
                  : mode === "forgot"
                    ? forgotEmailSent ? "Check your email" : "Forgot password?"
                    : step === 1 
                      ? "Create your account" 
                      : "Tell us about yourself"}
              </h2>
              <p className="text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to access your account"
                  : mode === "forgot"
                    ? forgotEmailSent 
                      ? "We've sent a password reset link to your email"
                      : "Enter your email and we'll send you a reset link"
                    : step === 1
                      ? "Start your journey to scam-free living"
                      : "Just a few more details to get started"}
              </p>
            </div>

            {/* Step Indicator (signup only) */}
            {mode === "signup" && (
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
                <div className={`w-12 h-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {/* Forgot Password - Email Sent Success */}
              {mode === "forgot" && forgotEmailSent && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-6">
                    If an account exists for <span className="font-medium text-foreground">{email}</span>, you'll receive an email with instructions to reset your password.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode("signin");
                      setForgotEmailSent(false);
                    }}
                  >
                    Return to sign in
                  </Button>
                </div>
              )}

              {/* Forgot Password - Email Input */}
              {mode === "forgot" && !forgotEmailSent && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full mt-6"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Send Reset Link
                  </Button>
                </>
              )}

              {(mode === "signin" || (mode === "signup" && step === 1)) && (
                <>
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={mode === "signin" ? "••••••••" : "Min 8 characters"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                </>
              )}

              {mode === "signup" && step === 2 && (
                <>
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="dob"
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        value={dob}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^\d/]/g, "");
                          // Auto-insert slashes
                          const digits = val.replace(/\//g, "");
                          if (digits.length >= 4) {
                            val = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
                          } else if (digits.length >= 2) {
                            val = digits.slice(0, 2) + "/" + digits.slice(2);
                          }
                          setDob(val);
                        }}
                        maxLength={10}
                        className="pl-10"
                      />
                    </div>
                    {errors.dob && <p className="text-sm text-destructive">{errors.dob}</p>}
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                      <CountryWhyCollected />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select your country</option>
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select your gender</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                  </div>

                  {/* How did you hear about us */}
                  <div className="space-y-2">
                    <Label htmlFor="referralSource">How did you hear about us? <span className="text-destructive">*</span></Label>
                    <select
                      id="referralSource"
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select an option</option>
                      {referralSourceOptions.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                    {errors.referralSource && <p className="text-sm text-destructive">{errors.referralSource}</p>}
                  </div>

                </>
              )}

              {/* Submit Button */}
              {mode !== "forgot" && (
                <>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full mt-6"
                    onClick={() => {
                      if (mode === "signin") {
                        handleSignIn();
                      } else if (step === 1) {
                        handleNextStep();
                      } else {
                        handleSignUp();
                      }
                    }}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {mode === "signin" ? "Sign In" : step === 1 ? "Continue" : "Create Account"}
                  </Button>

                  {/* Google OAuth - show on signin and signup step 1 */}
                  {(mode === "signin" || (mode === "signup" && step === 1)) && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={async () => {
                          const { error } = await supabase.auth.signInWithOAuth({
                            provider: "google",
                            options: {
                              redirectTo: `${window.location.origin}/portal`,
                            },
                          });
                          if (error) {
                            toast({
                              title: "Google sign in failed",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </Button>

                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={async () => {
                          const { error } = await supabase.auth.signInWithOAuth({
                            provider: "apple",
                            options: {
                              redirectTo: `${window.location.origin}/portal`,
                            },
                          });
                          if (error) {
                            toast({
                              title: "Apple sign in failed",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        Continue with Apple
                      </Button>
                    </>
                  )}
                </>
              )}
            </form>

            {/* Disclaimer for signup */}
            {mode === "signup" && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                By creating an account, you agree to our{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
                and{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>.
              </p>
            )}

            {/* Toggle Mode */}
            {mode !== "forgot" && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "signin" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signup");
                        setStep(1);
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signin");
                        setStep(1);
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
