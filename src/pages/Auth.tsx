import { useState, useEffect } from "react";
import authLogo from "@/assets/auth-logo.png";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Lock, User, Calendar, MapPin, Sun, Moon, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(50, "First name is too long"),
  dob: z.string().min(1, "Date of birth is required"),
  country: z.string().min(1, "Country is required"),
  gender: z.string().min(1, "Gender is required"),
});

const countries = [
  "Australia",
  "Canada",
  "Germany",
  "France",
  "India",
  "Japan",
  "New Zealand",
  "Singapore",
  "United Kingdom",
  "United States",
  "Other",
];

const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate("/portal");
    }
  }, [user, navigate]);

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
        dob: z.string().min(1, "Date of birth is required"),
        country: z.string().min(1, "Country is required"),
        gender: z.string().min(1, "Gender is required"),
      }).parse({ firstName, dob, country, gender });
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
    const { error } = await signUp(email, password, {
      first_name: firstName,
      dob,
      country,
      gender,
    });
    setLoading(false);

    if (error) {
      if (error.message?.includes("already registered")) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
        });
        setMode("signin");
        setStep(1);
      } else {
        toast({
          title: "Sign up failed",
          description: error.message || "Unable to create account",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate("/portal");
    }
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="hidden lg:flex lg:items-center">
            <img src={authLogo} alt="Scamly" className="lg:hidden h-10 w-auto" />
          </Link>

          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold mb-4">World class fraud detection.</h1>
            <p className="text-primary-foreground/80 text-lg">
              Join thousands of users who trust Scamly to keep them safe from fraud and phishing attempts.
            </p>
          </div>

          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Scamly. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6">
          <Link to="/" className="lg:hidden">
            <img src={authLogo} alt="Scamly" className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Back Button (for step 2) */}
            {mode === "signup" && step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold mb-2">
                {mode === "signin" ? "Welcome back" : step === 1 ? "Create your account" : "Tell us about yourself"}
              </h2>
              <p className="text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to access your account"
                  : step === 1
                    ? "Start your journey to scam-free living"
                    : "Just a few more details to get started"}
              </p>
            </div>

            {/* Step Indicator (signup only) */}
            {mode === "signup" && (
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? "gradient-bg" : "bg-muted"}`} />
                <div className={`w-12 h-1 rounded-full ${step >= 2 ? "gradient-bg" : "bg-muted"}`} />
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? "gradient-bg" : "bg-muted"}`} />
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {(mode === "signin" || step === 1) && (
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
                    <Label htmlFor="password">Password</Label>
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
                    <Label htmlFor="firstName">First Name</Label>
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
                    <Label htmlFor="dob">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.dob && <p className="text-sm text-destructive">{errors.dob}</p>}
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
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
                    <Label htmlFor="gender">Gender</Label>
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
                </>
              )}

              {/* Submit Button */}
              <Button
                variant="gradient"
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
            </form>

            {/* Toggle Mode */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
