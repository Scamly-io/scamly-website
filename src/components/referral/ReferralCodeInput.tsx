import { useState, useEffect } from 'react';
import { useReferral } from '@/hooks/useReferral';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2 } from 'lucide-react';

interface ReferralCodeInputProps {
  /** Called when a valid referral code is entered */
  onValidCode?: (code: string) => void;
  /** Called when the referral code is cleared or invalid */
  onClear?: () => void;
  /** Initial value for the input */
  initialValue?: string;
}

export function ReferralCodeInput({ 
  onValidCode, 
  onClear,
  initialValue = '' 
}: ReferralCodeInputProps) {
  const { validateCode } = useReferral();
  
  const [code, setCode] = useState(initialValue);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Validate code with debounce
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Clear validation if code is empty
    if (!code.trim()) {
      setValidationResult(null);
      onClear?.();
      return;
    }

    // Only validate if code is at least 3 characters
    if (code.trim().length < 3) {
      setValidationResult(null);
      return;
    }

    // Set new timer
    const timer = setTimeout(async () => {
      setIsValidating(true);
      const result = await validateCode(code.trim());
      setValidationResult(result);
      setIsValidating(false);

      if (result.valid && result.code) {
        onValidCode?.(result.code);
      } else {
        onClear?.();
      }
    }, 500);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
  };

  const handleClear = () => {
    setCode('');
    setValidationResult(null);
    onClear?.();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="referral-code">
        Referral Code <span className="text-muted-foreground">(optional)</span>
      </Label>
      
      <div className="relative">
        <Input
          id="referral-code"
          value={code}
          onChange={handleChange}
          placeholder="Enter referral code for 10% off"
          className={`pr-10 font-mono uppercase ${
            validationResult?.valid 
              ? 'border-green-500 focus-visible:ring-green-500' 
              : validationResult?.error 
                ? 'border-destructive focus-visible:ring-destructive' 
                : ''
          }`}
          maxLength={20}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isValidating && validationResult?.valid && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          {!isValidating && validationResult?.error && code && (
            <button
              type="button"
              onClick={handleClear}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Validation feedback */}
      {validationResult?.valid && (
        <p className="text-sm text-green-600">
          ✓ Valid code! You'll get 10% off your first invoice.
        </p>
      )}
      {validationResult?.error && (
        <p className="text-sm text-destructive">
          {validationResult.error}
        </p>
      )}
      
      {/* Info text when no code entered */}
      {!code && !validationResult && (
        <p className="text-sm text-muted-foreground">
          Have a friend's referral code? Enter it to save 10% on your first subscription.
        </p>
      )}
    </div>
  );
}
