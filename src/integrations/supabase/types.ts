export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          content: string
          created_at: string
          description: string | null
          free_access: boolean
          id: string
          primary_image: string | null
          quick_tip: boolean
          quick_tip_icon: string | null
          quick_tip_icon_background_colour: string | null
          quick_tip_icon_colour: string | null
          search_vector: unknown
          slug: string
          tags: string[] | null
          title: string
          views: number
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          free_access?: boolean
          id?: string
          primary_image?: string | null
          quick_tip?: boolean
          quick_tip_icon?: string | null
          quick_tip_icon_background_colour?: string | null
          quick_tip_icon_colour?: string | null
          search_vector?: unknown
          slug: string
          tags?: string[] | null
          title: string
          views?: number
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          free_access?: boolean
          id?: string
          primary_image?: string | null
          quick_tip?: boolean
          quick_tip_icon?: string | null
          quick_tip_icon_background_colour?: string | null
          quick_tip_icon_colour?: string | null
          search_vector?: unknown
          slug?: string
          tags?: string[] | null
          title?: string
          views?: number
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          openai_conversation_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          openai_conversation_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          openai_conversation_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      initial_meta_capi_events: {
        Row: {
          created_at: string
          event_id: string
          event_name: string
          event_time: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_name: string
          event_time: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_name?: string
          event_time?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "initial_meta_capi_event_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          id: string
          role: string | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          role?: string | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          content: Json | null
          id: string
          policy_type: string
          version: string
        }
        Insert: {
          content?: Json | null
          id?: string
          policy_type: string
          version: string
        }
        Update: {
          content?: Json | null
          id?: string
          policy_type?: string
          version?: string
        }
        Relationships: []
      }
      policy_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: unknown
          policy_id: string | null
          policy_type: string
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          policy_id?: string | null
          policy_type: string
          policy_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          policy_id?: string | null
          policy_type?: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acceptances_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_revenuecat_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          billing_issue: boolean
          country: string | null
          created_at: string
          data_sharing_consent: boolean
          dob: string | null
          fbp: string | null
          fbq: string | null
          first_name: string | null
          gender: string | null
          id: string
          ip_address: string | null
          onboarding_completed: boolean | null
          referral_source: string | null
          review_prompted: boolean | null
          subscription_current_period_end: string | null
          subscription_id: string | null
          subscription_plan: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_store: string | null
          user_agent: string | null
          welcome_email_sent: boolean
        }
        Insert: {
          access_expires_at?: string | null
          billing_issue?: boolean
          country?: string | null
          created_at?: string
          data_sharing_consent?: boolean
          dob?: string | null
          fbp?: string | null
          fbq?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          ip_address?: string | null
          onboarding_completed?: boolean | null
          referral_source?: string | null
          review_prompted?: boolean | null
          subscription_current_period_end?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_store?: string | null
          user_agent?: string | null
          welcome_email_sent?: boolean
        }
        Update: {
          access_expires_at?: string | null
          billing_issue?: boolean
          country?: string | null
          created_at?: string
          data_sharing_consent?: boolean
          dob?: string | null
          fbp?: string | null
          fbq?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          ip_address?: string | null
          onboarding_completed?: boolean | null
          referral_source?: string | null
          review_prompted?: boolean | null
          subscription_current_period_end?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_store?: string | null
          user_agent?: string | null
          welcome_email_sent?: boolean
        }
        Relationships: []
      }
      scans: {
        Row: {
          created_at: string
          id: string
          input_tokens: number | null
          openai_response_id: string
          output: string
          output_tokens: number | null
          user_id: string
        }
        Insert: {
          created_at: string
          id?: string
          input_tokens?: number | null
          openai_response_id: string
          output: string
          output_tokens?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number | null
          openai_response_id?: string
          output?: string
          output_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          content: string
          content_hash: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_policy_compliance: {
        Args: { p_user_id: string }
        Returns: {
          accepted_at: string
          current_version: string
          is_compliant: boolean
          policy_type: string
          user_accepted_version: string
        }[]
      }
      get_current_policy_version: {
        Args: { p_policy_type: string }
        Returns: {
          content_hash: string
          id: string
          policy_type: string
          published_at: string
          version: string
        }[]
      }
      get_user_counts: {
        Args: { uid: string }
        Returns: {
          article_read_count: number
          conversation_count: number
          scan_count: number
        }[]
      }
      get_user_email_by_id: { Args: { p_user_id: string }; Returns: string }
      increment_article_views: {
        Args: { article_id: string }
        Returns: undefined
      }
      message_belongs_to_user: {
        Args: { msg_conversation_id: string }
        Returns: boolean
      }
      search_articles: {
        Args: { search_text: string }
        Returns: {
          content: string
          description: string
          id: string
          image: string
          quick_tip: boolean
          quick_tip_icon: string
          quick_tip_icon_background_colour: string
          quick_tip_icon_colour: string
          rank: number
          slug: string
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
