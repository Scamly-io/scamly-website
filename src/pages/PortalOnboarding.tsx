import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, MapPin, Sun, Moon, Loader2 } from "lucide-react";
import { z } from "zod";
import { countries } from "@/constants/countries";
import logoLight from "@/assets/navbar-logo-light.png";
import logoDark from "@/assets/navbar-logo-dark.png";
import { useAuth } from "@/contexts/AuthContext";

const genders = ["Male", "Female", "Prefer not to say"];

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

const onboardingSchema = z.object({
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

export default function PortalOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { updateProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const initSession = async () => {
      const token = searchParams.get("token");

      if (token) {
        // Use the token for both access_token and refresh_token
        // Session won't persist long-term — by design for mobile webview
        const { error } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: token,
        });

        if (error) {
          console.error("Failed to set session from token:", error);
          navigate("/auth");
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      // Check if onboarding is already completed
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (profile?.onboarding_completed) {
        navigate("/portal");
        return;
      }

      setLoading(false);
    };

    initSession();
  }, [navigate, searchParams]);

  const handleSubmit = async () => {
    try {
      onboardingSchema.parse({ firstName, dob: dob || undefined, country, gender: gender || undefined, referralSource });
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
      return;
    }

    if (!userId) return;

    setSaving(true);

    // Convert dd/mm/yyyy to yyyy-mm-dd for storage
    let isoDate: string | null = null;
    if (dob && dob.trim() !== "") {
      const dobParts = dob.split("/");
      isoDate = dobParts.length === 3 ? `${dobParts[2]}-${dobParts[1]}-${dobParts[0]}` : dob;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        ...(isoDate ? { dob: isoDate } : {}),
        country,
        gender,
        referral_source: referralSource,
        onboarding_completed: true,
      })
      .eq("id", userId);

      const { error: updateProfileError } = await updateProfile({
        first_name: firstName,
        ...(isoDate ? { dob: isoDate } : {}),
        country,
        gender,
        referral_source: referralSource,
        onboarding_completed: true,
      });

    setSaving(false);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (updateProfileError) {
      toast({
        title: "Update failed",
        description: updateProfileError.message,
        variant: "destructive",
      });
    } else {
      const hasToken = searchParams.get("token");
      navigate(hasToken ? "/portal/onboarding-complete?ref=app" : "/portal/onboarding-complete?ref=web");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <img src={theme === "dark" ? logoDark : logoLight} alt="Scamly" className="h-9 w-auto" />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold mb-2">Complete your profile</h2>
            <p className="text-muted-foreground">Just a few details to get you started</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
              <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
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
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select your gender</option>
                {genders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
            </div>

            {/* Referral Source */}
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
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              {errors.referralSource && <p className="text-sm text-destructive">{errors.referralSource}</p>}
            </div>

            <Button
              variant="gradient"
              size="lg"
              className="w-full mt-6"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Complete Setup
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
