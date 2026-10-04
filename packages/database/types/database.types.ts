export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: string
          settings: Json
          feature_flags: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: string
          settings?: Json
          feature_flags?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: string
          settings?: Json
          feature_flags?: Json
          created_at?: string
          updated_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: string
          department: string | null
          device_group_scope: string[]
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: string
          department?: string | null
          device_group_scope?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: string
          department?: string | null
          device_group_scope?: string[]
          created_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          org_id: string
          device_id: string
          name: string
          hostname: string | null
          public_key: string | null
          status: string
          os_version: string | null
          agent_version: string | null
          last_seen: string | null
          hardware: Json
          network: Json
          capabilities: Json
          assigned_user_id: string | null
          group_ids: string[]
          tags: string[]
          asset_info: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          device_id: string
          name: string
          hostname?: string | null
          public_key?: string | null
          status?: string
          os_version?: string | null
          agent_version?: string | null
          last_seen?: string | null
          hardware?: Json
          network?: Json
          capabilities?: Json
          assigned_user_id?: string | null
          group_ids?: string[]
          tags?: string[]
          asset_info?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          device_id?: string
          name?: string
          hostname?: string | null
          public_key?: string | null
          status?: string
          os_version?: string | null
          agent_version?: string | null
          last_seen?: string | null
          hardware?: Json
          network?: Json
          capabilities?: Json
          assigned_user_id?: string | null
          group_ids?: string[]
          tags?: string[]
          asset_info?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          org_id: string
          device_id: string | null
          type: string
          severity: string
          title: string
          detail: Json
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          device_id?: string | null
          type: string
          severity: string
          title: string
          detail?: Json
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          device_id?: string | null
          type?: string
          severity?: string
          title?: string
          detail?: Json
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_device_health_score: {
        Args: { target_device_id: string }
        Returns: string
      }
      get_org_device_stats: {
        Args: { target_org_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
