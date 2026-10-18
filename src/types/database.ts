export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'

export type SemaphoreState =
  | 'active'
  | 'due_soon'
  | 'in_grace'
  | 'suspended'
  | 'offline'
  | 'cancelled'
  | 'unknown'

export interface Database {
  public: {
    Tables: {
      owners: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          nombre: string
          contacto: string | null
          telefono: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          contacto?: string | null
          telefono?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          contacto?: string | null
          telefono?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      apps: {
        Row: {
          id: string
          client_id: string
          slug: string
          nombre: string
          url_publica: string | null
          vendor_sync_url: string
          secret_name: string
          tenant_id: string
          precio_mensual_cop: number
          dia_vencimiento: number
          activa_en_panel: boolean
          panel_version: number
          cached_status: string | null
          cached_effective_status: string | null
          cached_current_period_end: string | null
          cached_grace_until: string | null
          cached_days_left: number | null
          cached_days_left_in_grace: number | null
          cached_enforcement_enabled: boolean | null
          cached_message: string | null
          cached_source: string | null
          cached_last_synced_at: string | null
          last_check_at: string | null
          last_check_ok: boolean | null
          last_check_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          slug: string
          nombre: string
          url_publica?: string | null
          vendor_sync_url: string
          secret_name: string
          tenant_id: string
          precio_mensual_cop: number
          dia_vencimiento: number
          activa_en_panel?: boolean
          panel_version?: number
          cached_status?: string | null
          cached_effective_status?: string | null
          cached_current_period_end?: string | null
          cached_grace_until?: string | null
          cached_days_left?: number | null
          cached_days_left_in_grace?: number | null
          cached_enforcement_enabled?: boolean | null
          cached_message?: string | null
          cached_source?: string | null
          cached_last_synced_at?: string | null
          last_check_at?: string | null
          last_check_ok?: boolean | null
          last_check_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['apps']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'apps_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          app_id: string
          fecha: string
          monto_cop: number
          periodo_desde: string
          periodo_hasta: string
          medio: string | null
          referencia: string | null
          notas: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          app_id: string
          fecha: string
          monto_cop: number
          periodo_desde: string
          periodo_hasta: string
          medio?: string | null
          referencia?: string | null
          notas?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'payments_app_id_fkey'
            columns: ['app_id']
            isOneToOne: false
            referencedRelation: 'apps'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          app_id: string | null
          accion: string
          payload: Json | null
          http_status: number | null
          response_code: string | null
          response_body: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          app_id?: string | null
          accion: string
          payload?: Json | null
          http_status?: number | null
          response_code?: string | null
          response_body?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Client = Database['public']['Tables']['clients']['Row']
export type App = Database['public']['Tables']['apps']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']

export type AppWithClient = App & {
  clients: Pick<Client, 'id' | 'nombre' | 'contacto' | 'telefono'> | null
}

export interface VendorSyncState {
  tenant_id: string
  status: SubscriptionStatus
  effective_status: string
  current_period_end: string
  grace_until: string | null
  days_left: number
  days_left_in_grace: number | null
  enforcement_enabled: boolean
  message: string | null
  source: string
  last_synced_at: string
  panel_version: number
}

export interface PanelProxyResponse {
  ok: boolean
  code?: string
  state?: VendorSyncState
  message?: string
}
