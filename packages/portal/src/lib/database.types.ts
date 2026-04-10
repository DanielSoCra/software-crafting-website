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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          company: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          formality: string | null
          id: string
          industry_key: string | null
          metadata: Json | null
          phone: string | null
          slug: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          formality?: string | null
          id?: string
          industry_key?: string | null
          metadata?: Json | null
          phone?: string | null
          slug: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          formality?: string | null
          id?: string
          industry_key?: string | null
          metadata?: Json | null
          phone?: string | null
          slug?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          status: string
          type: string
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          draft_answers: Json | null
          id: string
          published_at: string | null
          schema: Json
          sent_at: string | null
          status: string
          status_updated_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          draft_answers?: Json | null
          id?: string
          published_at?: string | null
          schema: Json
          sent_at?: string | null
          status?: string
          status_updated_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          draft_answers?: Json | null
          id?: string
          published_at?: string | null
          schema?: Json
          sent_at?: string | null
          status?: string
          status_updated_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_board_feedback: {
        Row: {
          client_id: string
          comment_negative: string | null
          comment_positive: string | null
          comment_very_good: string | null
          created_at: string | null
          deliverable_id: string
          id: string
          is_favorite: boolean | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          variant_name: string
          vote: string | null
        }
        Insert: {
          client_id: string
          comment_negative?: string | null
          comment_positive?: string | null
          comment_very_good?: string | null
          created_at?: string | null
          deliverable_id: string
          id?: string
          is_favorite?: boolean | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          variant_name: string
          vote?: string | null
        }
        Update: {
          client_id?: string
          comment_negative?: string | null
          comment_positive?: string | null
          comment_very_good?: string | null
          created_at?: string | null
          deliverable_id?: string
          id?: string
          is_favorite?: boolean | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          variant_name?: string
          vote?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mood_board_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_board_feedback_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answers: Json
          client_id: string
          form_id: string
          id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          client_id: string
          form_id: string
          id?: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          client_id?: string
          form_id?: string
          id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: true
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_id_for_user: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
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

