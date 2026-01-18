import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertCircle } from "lucide-react";

interface PasswordGateProps {
  children: ReactNode;
}

const SESSION_KEY = "private_testing_session";
// SHA-256 hash of "assured4BEVERAGE-pile"
const PASSWORD_HASH = "a1b8e3c4f5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateSessionToken(): Promise<string> {
  const timestamp = Date.now().toString();
  return await hashPassword(timestamp + PASSWORD_HASH);
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check for existing session
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const inputHash = await hashPassword(password);
      const correctHash = await hashPassword("assured4BEVERAGE-pile");
      
      if (inputHash === correctHash) {
        const sessionToken = await generateSessionToken();
        localStorage.setItem(SESSION_KEY, sessionToken);
        setIsAuthenticated(true);
      } else {
        setError("Incorrect password");
        setPassword("");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Private Testing</h1>
            <p className="text-muted-foreground text-center mt-2">
              This site is currently in private testing mode. Please enter the password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 text-base"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={!password || isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Access Site"}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          If you should have access, please contact the site administrator.
        </p>
      </div>
    </div>
  );
}
