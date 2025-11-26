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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      importers: {
        Row: {
          address: string
          company_name: string
          country: string
          created_at: string
          email: string | null
          id: string
          phone: string
          tax_id: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          company_name: string
          country: string
          created_at?: string
          email?: string | null
          id?: string
          phone: string
          tax_id: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          company_name?: string
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string
          tax_id?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          hs_code: string
          id: string
          invoice_id: string
          qty: number
          total: number
          unit_price: number
          volume: number | null
          weight: number
        }
        Insert: {
          created_at?: string
          description: string
          hs_code: string
          id?: string
          invoice_id: string
          qty: number
          total: number
          unit_price: number
          volume?: number | null
          weight: number
        }
        Update: {
          created_at?: string
          description?: string
          hs_code?: string
          id?: string
          invoice_id?: string
          qty?: number
          total?: number
          unit_price?: number
          volume?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          availability: string | null
          client_company_position: string
          client_position: string
          client_position_title: string
          client_representative: string
          company_type: Database["public"]["Enums"]["company_type"]
          created_at: string
          currency: string
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          importer_id: string
          incoterm: string
          invoice_number: string
          issue_date: string
          mode_of_transport: string
          notes: string | null
          payment_method: string
          place_of_issue: string
          source_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          client_company_position: string
          client_position: string
          client_position_title: string
          client_representative: string
          company_type: Database["public"]["Enums"]["company_type"]
          created_at?: string
          currency: string
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          importer_id: string
          incoterm: string
          invoice_number: string
          issue_date: string
          mode_of_transport: string
          notes?: string | null
          payment_method: string
          place_of_issue: string
          source_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          client_company_position?: string
          client_position?: string
          client_position_title?: string
          client_representative?: string
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          currency?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          importer_id?: string
          incoterm?: string
          invoice_number?: string
          issue_date?: string
          mode_of_transport?: string
          notes?: string | null
          payment_method?: string
          place_of_issue?: string
          source_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_importer_id_fkey"
            columns: ["importer_id"]
            isOneToOne: false
            referencedRelation: "importers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_invoice_id_fkey"
            columns: ["source_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      company_type: "equipamentos" | "insumos"
      document_type: "proforma" | "commercial" | "packing"
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
      company_type: ["equipamentos", "insumos"],
      document_type: ["proforma", "commercial", "packing"],
    },
  },
} as const
