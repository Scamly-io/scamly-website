import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { resetUser } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Copy, Loader2 } from "lucide-react";

const CONFIRMATION_TEXT = "confirm deletion";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-account");

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      resetUser();
      await signOut();
      navigate("/");
      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
    } catch (err) {
      console.error("[DeleteAccount] Error:", err);
      toast({
        title: "Deletion failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setOpen(false);
      setConfirmInput("");
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
                <li>Any active subscription (cancelled immediately with no further billing)</li>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
