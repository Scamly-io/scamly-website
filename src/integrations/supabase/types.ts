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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      article_reads: {
        Row: {
          article_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          id?: string
          read_at: string
          user_id: string
        }
        Update: {
          article_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_reads_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          content: string
          created_at: string
          description: string | null
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
      interested_users: {
        Row: {
          created_at: string
          email: string
          id: string
          unsubscribed: boolean
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          unsubscribed?: boolean
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          unsubscribed?: boolean
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      interested_users_testenvironment: {
        Row: {
          created_at: string
          email: string
          id: string
          unsubscribed: boolean
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          unsubscribed?: boolean
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          unsubscribed?: boolean
          unsubscribed_at?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          access_expires_at: string | null
          country: string | null
          created_at: string
          dob: string | null
          first_name: string | null
          gender: string | null
          id: string
          stripe_customer_id: string | null
          subscription_current_period_end: string | null
          subscription_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
        }
        Insert: {
          access_expires_at?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          stripe_customer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
        }
        Update: {
          access_expires_at?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_current_period_end?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      scans: {
        Row: {
          created_at: string
          id: string
          output: string | null
          response_id: string | null
          user_id: string
        }
        Insert: {
          created_at: string
          id?: string
          output?: string | null
          response_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          output?: string | null
          response_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_counts: {
        Args: { uid: string }
        Returns: {
          article_read_count: number
          conversation_count: number
          scan_count: number
        }[]
      }
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
