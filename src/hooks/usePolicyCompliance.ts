import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Policy, PolicyComplianceStatus, PolicyType } from '@/types/policy';
import { useAuth } from '@/contexts/AuthContext';

interface UsePolicyComplianceReturn {
  isLoading: boolean;
  isCompliant: boolean;
  complianceStatus: PolicyComplianceStatus[];
  currentPolicies: Policy[];
  pendingPolicies: PolicyType[];
  acceptPolicy: (policyType: PolicyType) => Promise<{ error: Error | null }>;
  acceptAllPolicies: () => Promise<{ error: Error | null }>;
  refreshCompliance: () => Promise<void>;
}

export function usePolicyCompliance(): UsePolicyComplianceReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [complianceStatus, setComplianceStatus] = useState<PolicyComplianceStatus[]>([]);
  const [currentPolicies, setCurrentPolicies] = useState<Policy[]>([]);

  const fetchCurrentPolicies = useCallback(async () => {
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .order('published_at', { ascending: false });

    if (!error && data) {
      // Get the latest version for each policy type
      const latestPolicies: Policy[] = [];
      const seenTypes = new Set<string>();
      
      for (const policy of data) {
        if (!seenTypes.has(policy.policy_type)) {
          latestPolicies.push(policy as Policy);
          seenTypes.add(policy.policy_type);
        }
      }
      
      setCurrentPolicies(latestPolicies);
    }
    
    return data || [];
  }, []);

  const fetchComplianceStatus = useCallback(async () => {
    if (!user) {
      setComplianceStatus([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // First fetch current policies
      await fetchCurrentPolicies();

      // Then check user's compliance using the database function
      const { data, error } = await supabase.rpc('check_user_policy_compliance', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking policy compliance:', error);
        setComplianceStatus([]);
      } else if (data) {
        setComplianceStatus(data as PolicyComplianceStatus[]);
      }
    } catch (err) {
      console.error('Error in fetchComplianceStatus:', err);
      setComplianceStatus([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchCurrentPolicies]);

  const refreshCompliance = useCallback(async () => {
    await fetchComplianceStatus();
  }, [fetchComplianceStatus]);

  useEffect(() => {
    fetchComplianceStatus();
  }, [fetchComplianceStatus]);

  const acceptPolicy = useCallback(async (policyType: PolicyType): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      // Find the current policy for this type
      const currentPolicy = currentPolicies.find(p => p.policy_type === policyType);
      
      if (!currentPolicy) {
        return { error: new Error(`No current ${policyType} policy found`) };
      }

      // Insert acceptance record
      const { error } = await supabase
        .from('policy_acceptances')
        .insert({
          user_id: user.id,
          policy_type: policyType,
          policy_version: currentPolicy.version,
          policy_id: currentPolicy.id,
          user_agent: navigator.userAgent,
          // IP address will be captured server-side if needed
        });

      if (error) {
        console.error('Error accepting policy:', error);
        return { error: error as Error };
      }

      // Refresh compliance status
      await refreshCompliance();
      
      return { error: null };
    } catch (err) {
      console.error('Error in acceptPolicy:', err);
      return { error: err as Error };
    }
  }, [user, currentPolicies, refreshCompliance]);

  // Compute pendingPolicies inside the callback to avoid stale closure issues
  const acceptAllPolicies = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Get the current pending policies from complianceStatus directly
    const pending: PolicyType[] = complianceStatus
      .filter(status => !status.is_compliant)
      .map(status => status.policy_type as PolicyType);
    
    for (const policyType of pending) {
      const result = await acceptPolicy(policyType);
      if (result.error) {
        return result;
      }
    }

    return { error: null };
  }, [user, acceptPolicy, complianceStatus]);

  // Derived state
  const isCompliant = complianceStatus.length > 0 && 
    complianceStatus.every(status => status.is_compliant);
  
  const pendingPolicies: PolicyType[] = complianceStatus
    .filter(status => !status.is_compliant)
    .map(status => status.policy_type);

  return {
    isLoading,
    isCompliant,
    complianceStatus,
    currentPolicies,
    pendingPolicies,
    acceptPolicy,
    acceptAllPolicies,
    refreshCompliance,
  };
}
