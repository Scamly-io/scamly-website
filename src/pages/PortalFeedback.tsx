import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { ArrowLeft, Loader2, LogOut, Send } from "lucide-react";
import logoLight from "../../public/navbar-logo-light.png";

export default function PortalFeedback() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Please enter your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (feedback.trim().length > 5000) {
      toast({
        title: "Feedback too long",
        description: "Please keep your feedback under 5000 characters.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-feedback", {
        body: { feedback: feedback.trim() },
      });

      if (error) {
        throw new Error(error.message || "Something went wrong.");
      }

      if (data?.error) {
        toast({
          title: "Unable to submit",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
      setFeedback("");
    } catch (err: any) {
      toast({
        title: "Something went wrong",
        description: "There was an issue submitting your feedback. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <nav className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-6xl rounded-2xl bg-background/70 backdrop-blur-xl border border-border/50 shadow-sm">
        <div className="px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center">
              <img src={logoLight.src} alt="Scamly" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { signOut(); navigate("/"); }}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6 -ml-2"
            onClick={() => navigate("/portal")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold mb-2">Give Feedback</h1>
              <p className="text-muted-foreground">
                We're committed to making Scamly the exact tool you need to stay safe from scams, which means we want your feedback.
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Tell us what you think..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[160px] resize-y"
                maxLength={5000}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {feedback.length}/5000 characters
                </p>
                <Button
                  className="text-white"
                  style={{ backgroundColor: '#5022f6' }}
                  onClick={handleSubmit}
                  disabled={submitting || !feedback.trim()}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Feedback
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
