import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { captureError } from '@/lib/sentry';
import type { 
  ReferralStats, 
  ValidateReferralResponse, 
  UpdateReferralCodeResponse 
} from '@/types/referral';

export function useReferral() {
  const { session } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch referral stats
  const fetchStats = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      // Let the Supabase client handle auth headers automatically
      const { data, error: fnError } = await supabase.functions.invoke('get-referral-stats');

      if (fnError) {
        console.error('[useReferral] Edge function error:', fnError);
        throw fnError;
      }
      if (data?.error) throw new Error(data.error);

      setStats(data as ReferralStats);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch referral stats';
      setError(errorMsg);
      captureError(err instanceof Error ? err : new Error(errorMsg), {
        source: 'useReferral',
        action: 'fetchStats',
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Validate a referral code
  const validateCode = useCallback(async (
    referralCode: string
  ): Promise<ValidateReferralResponse> => {
    if (!session) {
      return { valid: false, error: 'Not authenticated' };
    }

    try {
      // Let the Supabase client handle auth headers automatically
      const { data, error: fnError } = await supabase.functions.invoke('validate-referral', {
        body: { referralCode },
      });

      if (fnError) {
        console.error('[useReferral] Validate code error:', fnError);
        throw fnError;
      }
      return data as ValidateReferralResponse;
    } catch (err) {
      captureError(err instanceof Error ? err : new Error('Referral validation failed'), {
        source: 'useReferral',
        action: 'validateCode',
      });
      return { 
        valid: false, 
        error: err instanceof Error ? err.message : 'Validation failed' 
      };
    }
  }, [session]);

  // Update referral code
  const updateCode = useCallback(async (
    newCode: string
  ): Promise<UpdateReferralCodeResponse> => {
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Let the Supabase client handle auth headers automatically
      const { data, error: fnError } = await supabase.functions.invoke('update-referral-code', {
        body: { newCode },
      });

      if (fnError) {
        console.error('[useReferral] Update code error:', fnError);
        throw fnError;
      }
      
      // Refresh stats after update
      if (data.success) {
        await fetchStats();
      }
      
      return data as UpdateReferralCodeResponse;
    } catch (err) {
      captureError(err instanceof Error ? err : new Error('Referral code update failed'), {
        source: 'useReferral',
        action: 'updateCode',
      });
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Update failed' 
      };
    }
  }, [session, fetchStats]);

  // Fetch stats on mount and when session changes
  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    validateCode,
    updateCode,
  };
}
