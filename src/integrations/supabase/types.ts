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
      attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          invoice_id: string | null
          order_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          invoice_id?: string | null
          order_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          invoice_id?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_city_state: string | null
          archived: boolean | null
          company_name: string
          country_of_destination: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          tax_identification_number: string | null
          zip_code: string | null
        }
        Insert: {
          address_city_state?: string | null
          archived?: boolean | null
          company_name: string
          country_of_destination?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          tax_identification_number?: string | null
          zip_code?: string | null
        }
        Update: {
          address_city_state?: string | null
          archived?: boolean | null
          company_name?: string
          country_of_destination?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          tax_identification_number?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      importers: {
        Row: {
          address: string
          archived: boolean | null
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
          archived?: boolean | null
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
          archived?: boolean | null
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
          apply_discount: boolean | null
          availability: string | null
          client_company_position: string
          client_position: string
          client_position_title: string
          client_representative: string
          company_type: Database["public"]["Enums"]["company_type"]
          country_of_destination: string | null
          created_at: string
          currency: string
          discount_amount: number | null
          document_type: Database["public"]["Enums"]["document_type"]
          exporter_address_key: string | null
          freight_cost: number | null
          id: string
          importer_id: string
          include_packing_weight: boolean | null
          import_duties_taxes: number | null
          incoterm: string
          insurance_cost: number | null
          invoice_number: string
          issue_date: string
          mode_of_transport: string
          notes: string | null
          order_id: string | null
          packing_weight: number | null
          payment_method: string
          place_of_delivery: string | null
          place_of_destination: string | null
          place_of_issue: string
          port_of_discharge: string | null
          port_of_loading: string | null
          show_total_weight: boolean | null
          source_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          apply_discount?: boolean | null
          availability?: string | null
          client_company_position: string
          client_position: string
          client_position_title: string
          client_representative: string
          company_type: Database["public"]["Enums"]["company_type"]
          country_of_destination?: string | null
          created_at?: string
          currency: string
          discount_amount?: number | null
          document_type: Database["public"]["Enums"]["document_type"]
          exporter_address_key?: string | null
          freight_cost?: number | null
          id?: string
          importer_id: string
          include_packing_weight?: boolean | null
          import_duties_taxes?: number | null
          incoterm: string
          insurance_cost?: number | null
          invoice_number: string
          issue_date: string
          mode_of_transport: string
          notes?: string | null
          order_id?: string | null
          packing_weight?: number | null
          payment_method: string
          place_of_delivery?: string | null
          place_of_destination?: string | null
          place_of_issue: string
          port_of_discharge?: string | null
          port_of_loading?: string | null
          show_total_weight?: boolean | null
          source_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          apply_discount?: boolean | null
          availability?: string | null
          client_company_position?: string
          client_position?: string
          client_position_title?: string
          client_representative?: string
          company_type?: Database["public"]["Enums"]["company_type"]
          country_of_destination?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          document_type?: Database["public"]["Enums"]["document_type"]
          exporter_address_key?: string | null
          freight_cost?: number | null
          id?: string
          importer_id?: string
          include_packing_weight?: boolean | null
          import_duties_taxes?: number | null
          incoterm?: string
          insurance_cost?: number | null
          invoice_number?: string
          issue_date?: string
          mode_of_transport?: string
          notes?: string | null
          order_id?: string | null
          packing_weight?: number | null
          payment_method?: string
          place_of_delivery?: string | null
          place_of_destination?: string | null
          place_of_issue?: string
          port_of_discharge?: string | null
          port_of_loading?: string | null
          show_total_weight?: boolean | null
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
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      orders: {
        Row: {
          archived: boolean | null
          base_number: string
          created_at: string
          id: string
          order_note: string | null
          order_number: string
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          base_number: string
          created_at?: string
          id?: string
          order_note?: string | null
          order_number: string
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          base_number?: string
          created_at?: string
          id?: string
          order_note?: string | null
          order_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          archived: boolean | null
          created_at: string
          description: string
          hs_code: string
          id: string
          weight_kg: number | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          description: string
          hs_code: string
          id?: string
          weight_kg?: number | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          description?: string
          hs_code?: string
          id?: string
          weight_kg?: number | null
        }
        Relationships: []
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
