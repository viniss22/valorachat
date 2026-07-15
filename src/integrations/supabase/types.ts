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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_processing_logs: {
        Row: {
          confidence: number | null
          created_at: string
          error_message: string | null
          extracted_json: Json | null
          id: string
          latency_ms: number | null
          message_text: string
          model: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          extracted_json?: Json | null
          id?: string
          latency_ms?: number | null
          message_text: string
          model: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          extracted_json?: Json | null
          id?: string
          latency_ms?: number | null
          message_text?: string
          model?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["transaction_kind"]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount_cents: number
          created_at: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          accumulated_cents: number
          color: string | null
          created_at: string
          deadline: string | null
          id: string
          target_cents: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_cents?: number
          color?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          target_cents: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_cents?: number
          color?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          target_cents?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lgpd_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted: boolean
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          mfa_enabled: boolean
          updated_at: string
          whatsapp_last_sync_at: string | null
          whatsapp_number: string | null
          whatsapp_status: string
          whatsapp_verified_at: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          mfa_enabled?: boolean
          updated_at?: string
          whatsapp_last_sync_at?: string | null
          whatsapp_number?: string | null
          whatsapp_status?: string
          whatsapp_verified_at?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          mfa_enabled?: boolean
          updated_at?: string
          whatsapp_last_sync_at?: string | null
          whatsapp_number?: string | null
          whatsapp_status?: string
          whatsapp_verified_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          plan: string
          price_cents: number | null
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan: string
          price_cents?: number | null
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan?: string
          price_cents?: number | null
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          installment_number: number
          installments_total: number
          kind: Database["public"]["Enums"]["transaction_kind"]
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          received_date: string | null
          source: string
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          category: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          installment_number?: number
          installments_total?: number
          kind: Database["public"]["Enums"]["transaction_kind"]
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          received_date?: string | null
          source?: string
          transaction_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          installments_total?: number
          kind?: Database["public"]["Enums"]["transaction_kind"]
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          received_date?: string | null
          source?: string
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          ai_parse_calls: number
          api_errors: number
          created_at: string
          id: string
          metric_month: string
          transactions_count: number
          updated_at: string
          user_id: string
          whatsapp_messages_in: number
          whatsapp_messages_out: number
        }
        Insert: {
          ai_parse_calls?: number
          api_errors?: number
          created_at?: string
          id?: string
          metric_month: string
          transactions_count?: number
          updated_at?: string
          user_id: string
          whatsapp_messages_in?: number
          whatsapp_messages_out?: number
        }
        Update: {
          ai_parse_calls?: number
          api_errors?: number
          created_at?: string
          id?: string
          metric_month?: string
          transactions_count?: number
          updated_at?: string
          user_id?: string
          whatsapp_messages_in?: number
          whatsapp_messages_out?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          direction: string | null
          id: string
          message_text: string | null
          parsed_json: Json | null
          parsing_error: string | null
          parsing_status: string | null
          phone_e164: string
          transaction_id: string | null
          user_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: string | null
          id?: string
          message_text?: string | null
          parsed_json?: Json | null
          parsing_error?: string | null
          parsing_status?: string | null
          phone_e164: string
          transaction_id?: string | null
          user_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string | null
          id?: string
          message_text?: string | null
          parsed_json?: Json | null
          parsing_error?: string | null
          parsing_status?: string | null
          phone_e164?: string
          transaction_id?: string | null
          user_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone_e164: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone_e164: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone_e164?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payment_method:
        | "pix"
        | "dinheiro"
        | "debito"
        | "credito"
        | "boleto"
        | "transferencia"
        | "outro"
      transaction_kind: "receita" | "despesa"
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
    Enums: {
      app_role: ["admin", "user"],
      payment_method: [
        "pix",
        "dinheiro",
        "debito",
        "credito",
        "boleto",
        "transferencia",
        "outro",
      ],
      transaction_kind: ["receita", "despesa"],
    },
  },
} as const
