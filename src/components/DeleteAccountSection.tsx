import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { resetUser } from "../lib/analytics";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { AlertTriangle, Trash2, Copy, Loader2, ShieldAlert, Mail } from "lucide-react";

const CONFIRMATION_TEXT = "confirm deletion";

type DeletionError = {
  type: "active_subscription" | "subscription_mismatch" | "verification_failed" | "generic";
  code?: string;
  message: string;
};

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<DeletionError | null>(null);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isConfirmed = confirmInput === CONFIRMATION_TEXT;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONFIRMATION_TEXT);
      toast({ title: "Copied to clipboard", description: `"${CONFIRMATION_TEXT}" copied.` });
    } catch {
      toast({ title: "Copy failed", description: "Please type it manually.", variant: "destructive" });
    }
  };

  const handleCopyErrorCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Error code copied", description: `"${code}" copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Please note down the error code manually.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    setDeletionError(null);

    try {
      const { data, error } = await supabase.functions.invoke("delete-account");

      if (error) {
        // Try to parse the error context for structured response
        let errorBody: any = null;
        try {
          if (error.context && typeof error.context === "object") {
            errorBody = error.context;
          }
        } catch {}

        // FunctionsHttpError includes the response body
        if (error.message) {
          try {
            errorBody = JSON.parse(error.message);
          } catch {}
        }

        if (errorBody?.type) {
          handleStructuredError(errorBody);
          return;
        }

        throw new Error(error.message || "Something went wrong");
      }

      if (data?.error) {
        if (data.type) {
          handleStructuredError(data);
          return;
        }
        throw new Error(data.error);
      }

      resetUser();
      await signOut();
      navigate("/account-deleted");
    } catch (err) {
      console.error("[DeleteAccount] Error:", err);
      setDeletionError({
        type: "generic",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleStructuredError = (errorData: { type: string; code?: string; error: string }) => {
    switch (errorData.type) {
      case "active_subscription":
        setDeletionError({
          type: "active_subscription",
          code: errorData.code,
          message: errorData.error,
        });
        break;
      case "subscription_mismatch":
        setDeletionError({
          type: "subscription_mismatch",
          code: errorData.code,
          message: errorData.error,
        });
        break;
      case "verification_failed":
        setDeletionError({
          type: "verification_failed",
          code: errorData.code,
          message: errorData.error,
        });
        break;
      default:
        setDeletionError({
          type: "generic",
          code: errorData.code,
          message: errorData.error,
        });
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setOpen(false);
      setConfirmInput("");
      setDeletionError(null);
    }
  };

  return (
    <>
      {/* Danger Zone */}
      <div className="mt-10 pt-8 border-t border-destructive/30">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display font-bold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
        </div>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent hideCloseButton={deleting}>
          {/* Active Subscription Error */}
          {deletionError?.type === "active_subscription" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="w-5 h-5" />
                  Active Subscription Detected
                </DialogTitle>
                <DialogDescription className="pt-2 space-y-3 leading-relaxed">
                  <span className="block">
                    You currently have an active Scamly Premium subscription.
                  </span>
                  <span className="block">
                    To delete your account, please <strong className="text-foreground">cancel your subscription first</strong> through
                    the app you subscribed with (Apple App Store or Google Play Store), then try again.
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Once your subscription is cancelled and expires, you'll be able to delete your account.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Understood
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Subscription Mismatch Error */}
          {deletionError?.type === "subscription_mismatch" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="w-5 h-5" />
                  Unable to Process Deletion
                </DialogTitle>
                <DialogDescription className="pt-2 space-y-3 leading-relaxed">
                  <span className="block">
                    There was an issue verifying your subscription status. Please contact our support team
                    so we can assist you with your account deletion.
                  </span>
                  <span className="block">
                    Include the following error code in your email:
                  </span>
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3">
                    <code className="text-sm font-mono font-bold text-foreground flex-1">
                      {deletionError.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyErrorCode(deletionError.code!)}
                      className="text-xs h-7 px-2 shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    window.location.href = `mailto:support@scamly.io?subject=Account Deletion Issue (${deletionError.code})&body=Hi Scamly Support,%0A%0AI'm unable to delete my account. My error code is: ${deletionError.code}%0A%0APlease help me resolve this.%0A%0AThank you.`;
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Verification Failed Error */}
          {deletionError?.type === "verification_failed" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="w-5 h-5" />
                  Verification Failed
                </DialogTitle>
                <DialogDescription className="pt-2 space-y-3 leading-relaxed">
                  <span className="block">
                    We were unable to verify your subscription status at this time. Please try again later.
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    If this issue persists, please contact support with error code:{" "}
                    <code className="font-mono font-semibold text-foreground">{deletionError.code}</code>
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setDeletionError(null);
                    setConfirmInput("");
                  }}
                >
                  Try Again
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Generic Error */}
          {deletionError?.type === "generic" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Deletion Failed
                </DialogTitle>
                <DialogDescription className="pt-2 leading-relaxed">
                  <span className="block">{deletionError.message}</span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setDeletionError(null);
                    setConfirmInput("");
                  }}
                >
                  Try Again
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Default: Confirmation Form (no error state) */}
          {!deletionError && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Delete your account?
                </DialogTitle>
                <DialogDescription className="pt-2 space-y-3 leading-relaxed">
                  <span className="block">
                    This will <strong className="text-foreground">permanently</strong> delete your
                    Scamly account including:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Your profile and personal data</li>
                    <li>All scan history and chat conversations</li>
                    <li>Your referral data and rewards</li>
                  </ul>
                  <span className="block font-medium text-destructive">
                    This action is irreversible and cannot be undone.
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Type <span className="font-mono font-semibold text-foreground">"{CONFIRMATION_TEXT}"</span> to confirm:
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs h-7 px-2"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  disabled={deleting}
                  autoComplete="off"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!isConfirmed || deleting}
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Permanently Delete Account
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
