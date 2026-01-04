import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-referral-stats', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setStats(data as ReferralStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch referral stats');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Validate a referral code
  const validateCode = useCallback(async (
    referralCode: string
  ): Promise<ValidateReferralResponse> => {
    if (!session?.access_token) {
      return { valid: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-referral', {
        body: { referralCode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;
      return data as ValidateReferralResponse;
    } catch (err) {
      return { 
        valid: false, 
        error: err instanceof Error ? err.message : 'Validation failed' 
      };
    }
  }, [session?.access_token]);

  // Update referral code
  const updateCode = useCallback(async (
    newCode: string
  ): Promise<UpdateReferralCodeResponse> => {
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-referral-code', {
        body: { newCode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;
      
      // Refresh stats after update
      if (data.success) {
        await fetchStats();
      }
      
      return data as UpdateReferralCodeResponse;
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Update failed' 
      };
    }
  }, [session?.access_token, fetchStats]);

  // Fetch stats on mount and when session changes
  useEffect(() => {
    if (session?.access_token) {
      fetchStats();
    }
  }, [session?.access_token, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    validateCode,
    updateCode,
  };
}
