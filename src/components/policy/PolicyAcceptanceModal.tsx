'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Loader2, FileText, Shield, ExternalLink } from 'lucide-react';
import { PolicyType, Policy, PolicyComplianceStatus } from '../../types/policy';

interface PolicyAcceptanceModalProps {
  isOpen: boolean;
  pendingPolicies: PolicyType[];
  currentPolicies: Policy[];
  complianceStatus: PolicyComplianceStatus[];
  onAccept: () => Promise<{ error: Error | null }>;
  isLoading?: boolean;
}

export function PolicyAcceptanceModal({
  isOpen,
  pendingPolicies,
  currentPolicies,
  complianceStatus,
  onAccept,
  isLoading = false,
}: PolicyAcceptanceModalProps) {
  const [accepted, setAccepted] = useState<Record<PolicyType, boolean>>({
    privacy: false,
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPendingAccepted = pendingPolicies.every(type => accepted[type]);

  // Determine if this is a new user (no previous acceptances) or a policy update
  const isNewUser = useMemo(() => {
    return pendingPolicies.every(policyType => {
      const status = complianceStatus.find(s => s.policy_type === policyType);
      return !status?.user_accepted_version;
    });
  }, [pendingPolicies, complianceStatus]);

  const handleAccept = async () => {
    if (!allPendingAccepted) return;

    setIsSubmitting(true);
    setError(null);

    const result = await onAccept();

    if (result.error) {
      setError(result.error.message);
      setIsSubmitting(false);
    }
    // If successful, the modal will close automatically via the parent
  };

  const getPolicyVersion = (policyType: PolicyType): string => {
    const policy = currentPolicies.find(p => p.policy_type === policyType);
    return policy?.version || 'Unknown';
  };

  const getPreviousVersion = (policyType: PolicyType): string | null => {
    const status = complianceStatus.find(s => s.policy_type === policyType);
    return status?.user_accepted_version || null;
  };

  const getPolicyLabel = (policyType: PolicyType): string => {
    return policyType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
  };

  const getPolicyLink = (policyType: PolicyType): string => {
    return policyType === 'privacy' ? '/privacy' : '/terms';
  };

  const getPolicyIcon = (policyType: PolicyType) => {
    return policyType === 'privacy' ? Shield : FileText;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {isNewUser ? 'Accept Our Policies' : 'Policy Updates Required'}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {isNewUser 
              ? 'Before you continue, please review and accept our policies.'
              : "We've updated our policies. Please review and accept the latest versions to continue using Scamly."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {pendingPolicies.map((policyType) => {
            const Icon = getPolicyIcon(policyType);
            const previousVersion = getPreviousVersion(policyType);
            const currentVersion = getPolicyVersion(policyType);

            return (
              <div
                key={policyType}
                className="p-4 rounded-xl border border-border bg-muted/30"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">
                        {getPolicyLabel(policyType)}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        v{currentVersion}
                      </span>
                    </div>
                    {previousVersion && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Previously accepted: v{previousVersion}
                      </p>
                    )}
                    <Link
                      href={getPolicyLink(policyType)}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Read full policy
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                  <Checkbox
                    id={`accept-${policyType}`}
                    checked={accepted[policyType]}
                    onCheckedChange={(checked) =>
                      setAccepted((prev) => ({
                        ...prev,
                        [policyType]: checked === true,
                      }))
                    }
                  />
                  <Label
                    htmlFor={`accept-${policyType}`}
                    className="text-sm cursor-pointer"
                  >
                    I have read and accept the {getPolicyLabel(policyType)}
                  </Label>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="flex justify-center pt-2">
          <Button
            variant="gradient"
            onClick={handleAccept}
            disabled={!allPendingAccepted || isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Accept & Continue
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By accepting, you acknowledge that you have read and understood these policies.
          Your acceptance is recorded with timestamp for compliance purposes.
        </p>
      </DialogContent>
    </Dialog>
  );
}
