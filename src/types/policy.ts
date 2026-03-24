// Types for versioned policy acceptance system

export interface PolicySection {
  level: number;
  text: string;
}

export interface PolicyContentBlock {
  title: string;
  sections: PolicySection[];
}

export interface Policy {
  id: string;
  policy_type: 'privacy' | 'terms';
  version: string;
  content: PolicyContentBlock[] | null;
}

export interface PolicyAcceptance {
  id: string;
  user_id: string;
  policy_type: 'privacy' | 'terms';
  policy_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  policy_id: string | null;
}

export interface PolicyComplianceStatus {
  policy_type: 'privacy' | 'terms';
  current_version: string;
  user_accepted_version: string | null;
  is_compliant: boolean;
  accepted_at: string | null;
}

export type PolicyType = 'privacy' | 'terms';
