import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
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
      businesses: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          address: string
          logo_url: string | null
          created_at: string
          settings: Json | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          address: string
          logo_url?: string | null
          created_at?: string
          settings?: Json | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          address?: string
          logo_url?: string | null
          created_at?: string
          settings?: Json | null
        }
      }
      loyalty_cards: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string
          design: Json
          rules: Json
          enrollment_form: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          description: string
          design: Json
          rules: Json
          enrollment_form: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          description?: string
          design?: Json
          rules?: Json
          enrollment_form?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          business_id: string
          name: string
          phone: string
          email: string | null
          custom_fields: Json | null
          enrollment_date: string
          total_visits: number
          total_spent: number | null
          last_visit: string | null
          tags: string[]
          consent: Json
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          phone: string
          email?: string | null
          custom_fields?: Json | null
          enrollment_date?: string
          total_visits?: number
          total_spent?: number | null
          last_visit?: string | null
          tags?: string[]
          consent: Json
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          phone?: string
          email?: string | null
          custom_fields?: Json | null
          enrollment_date?: string
          total_visits?: number
          total_spent?: number | null
          last_visit?: string | null
          tags?: string[]
          consent?: Json
          created_at?: string
        }
      }
      customer_loyalty_cards: {
        Row: {
          id: string
          customer_id: string
          loyalty_card_id: string
          current_stamps: number
          total_redeemed: number
          wallet_pass_url: string | null
          qr_code: string
          status: 'active' | 'completed' | 'expired'
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          loyalty_card_id: string
          current_stamps?: number
          total_redeemed?: number
          wallet_pass_url?: string | null
          qr_code: string
          status?: 'active' | 'completed' | 'expired'
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          loyalty_card_id?: string
          current_stamps?: number
          total_redeemed?: number
          wallet_pass_url?: string | null
          qr_code?: string
          status?: 'active' | 'completed' | 'expired'
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          business_id: string
          name: string
          type: 'manual' | 'ai_generated'
          trigger: Json
          content: Json
          target_audience: Json
          schedule: Json
          status: 'draft' | 'active' | 'paused' | 'completed'
          performance: Json
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          type: 'manual' | 'ai_generated'
          trigger: Json
          content: Json
          target_audience: Json
          schedule: Json
          status?: 'draft' | 'active' | 'paused' | 'completed'
          performance?: Json
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          type?: 'manual' | 'ai_generated'
          trigger?: Json
          content?: Json
          target_audience?: Json
          schedule?: Json
          status?: 'draft' | 'active' | 'paused' | 'completed'
          performance?: Json
          created_at?: string
        }
      }
      ai_insights: {
        Row: {
          id: string
          business_id: string
          type: 'customer_segment' | 'campaign_suggestion' | 'revenue_opportunity'
          title: string
          description: string
          recommended_action: string
          priority: 'low' | 'medium' | 'high'
          status: 'pending' | 'acted_on' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          type: 'customer_segment' | 'campaign_suggestion' | 'revenue_opportunity'
          title: string
          description: string
          recommended_action: string
          priority: 'low' | 'medium' | 'high'
          status?: 'pending' | 'acted_on' | 'dismissed'
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          type?: 'customer_segment' | 'campaign_suggestion' | 'revenue_opportunity'
          title?: string
          description?: string
          recommended_action?: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'acted_on' | 'dismissed'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}