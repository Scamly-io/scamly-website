import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/profile";
import { captureError } from "@/lib/sentry";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const welcomeEmailSentRef = useRef<Set<string>>(new Set());

  const sendWelcomeEmail = async (userId: string) => {
    // Prevent duplicate calls using a ref to track in-flight requests
    if (welcomeEmailSentRef.current.has(userId)) {
      return;
    }
    welcomeEmailSentRef.current.add(userId);

    try {
      const { error } = await supabase.functions.invoke("send-customer-email", {
        body: { type: "welcome", userId },
      });
      if (error) {
        console.error("Failed to send welcome email:", error);
        captureError(new Error(error.message || "Failed to send welcome email"), {
          source: "AuthContext",
          action: "sendWelcomeEmail",
          userId,
        });
        // Remove from set so it can be retried on next session
        welcomeEmailSentRef.current.delete(userId);
      }
    } catch (err) {
      console.error("Error sending welcome email:", err);
      captureError(err instanceof Error ? err : new Error("Unknown error sending welcome email"), {
        source: "AuthContext",
        action: "sendWelcomeEmail",
        userId,
      });
      welcomeEmailSentRef.current.delete(userId);
    }
  };

  const fetchProfile = async (userId: string, userEmailConfirmed?: boolean) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (!error && data) {
      setProfile(data as Profile);
      
      // Send welcome email if email is confirmed and welcome email hasn't been sent yet
      if (userEmailConfirmed && !data.welcome_email_sent) {
        sendWelcomeEmail(userId);
      }
    }
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Defer profile fetch with setTimeout
      if (session?.user) {
        const isEmailConfirmed = !!session.user.email_confirmed_at;
        setTimeout(() => {
          fetchProfile(session.user.id, isEmailConfirmed);
        }, 0);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const isEmailConfirmed = !!session.user.email_confirmed_at;
        fetchProfile(session.user.id, isEmailConfirmed);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, profileData: Partial<Profile>) => {
    try {
      const redirectUrl = `${window.location.origin}/portal`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: profileData.first_name,
            dob: profileData.dob,
            gender: profileData.gender,
            country: profileData.country,
            referral_source: profileData.referral_source,
            onboarding_completed: true,
          },
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").update(data).eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        updateEmail,
        updatePassword,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
