/**
 * Database types for Supabase, written by hand to mirror
 * supabase/migrations/0001_schema.sql. Same shape as `supabase gen types`,
 * so it can be replaced by the generated file later:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Keep this file in sync with every new migration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Check-constraint unions (columns are `text` + CHECK in Postgres)
// ---------------------------------------------------------------------------
export type UserRole = "user" | "admin";
export type PlaceCategory =
  | "turistico"
  | "comida"
  | "salud"
  | "tramites"
  | "compras"
  | "universidad";
export type TransportMode = "combi" | "mototaxi" | "bus" | "colectivo" | "taxi";
export type ReviewTargetType = "place" | "route" | "food";
export type ReviewStatus = "visible" | "hidden";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type TipStatus = "pending" | "approved" | "rejected";
export type ChatRole = "user" | "assistant";
export type AiFeature = "chat" | "photo_medicine" | "photo_food";
/** transport_routes.path: list of [lat, lng] points for Leaflet. */
export type RoutePath = [number, number][];

/** Columns shared by every content table. */
type ContentRow = {
  id: string;
  /** Required (not null) only on medicines and transport_routes. */
  source_name: string | null;
  source_url: string | null;
  verified_at: string | null; // date (YYYY-MM-DD)
  verified_by: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
type ContentInsert = {
  id?: string;
  source_name?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
};

/** Medicines and transport fares keep a required source (safety rule). */
type RequiredSource = { source_name: string; source_url: string };

type Optional<T> = { [K in keyof T]?: T[K] };

type VerifiedByRelationship<T extends string> = {
  foreignKeyName: `${T}_verified_by_fkey`;
  columns: ["verified_by"];
  isOneToOne: false;
  referencedRelation: "profiles";
  referencedColumns: ["id"];
};

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  origin_country: string;
  destination_country: string;
  destination_city: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

type MedicineFields = {
  brand_name_pe: string;
  active_ingredient: string;
  presentation: string | null;
  general_use: string | null;
  /** "Equivalente referencial" in Colombia. */
  equivalent_co: string | null;
  where_to_buy: string | null;
  warning: string;
  digemid_url: string;
  keywords: string[];
};

type FoodFields = {
  name: string;
  description: string | null;
  main_ingredients: string | null;
  similar_co: string | null;
  where_to_try: string | null;
  image_url: string | null;
  keywords: string[];
};

type PlaceFields = {
  name: string;
  category: PlaceCategory;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  price_info: string | null;
  image_url: string | null;
};

type TransportRouteFields = {
  code: string | null;
  name: string;
  mode: TransportMode;
  origin_name: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_name: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  path: Json | null;
  fare_min: number | null;
  fare_max: number | null;
  schedule: string | null;
  tips: string | null;
};

type SlangTermFields = {
  term: string;
  meaning: string;
  equivalent_co: string | null;
  example: string | null;
  category: string | null;
};

type CustomFields = {
  title: string;
  body: string;
  category: string | null;
  icon: string | null;
};

type ReviewRow = {
  id: string;
  user_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  rating: number;
  body: string | null;
  status: ReviewStatus;
  report_count: number;
  created_at: string;
  updated_at: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  /** Exactly one of review_id / tip_id is set. */
  review_id: string | null;
  tip_id: string | null;
  reason: string;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

type TipRow = {
  id: string;
  user_id: string;
  category: string | null;
  body: string;
  status: TipStatus;
  report_count: number;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Row of get_reviews(): author's first name instead of user_id. */
export type ReviewListRow = {
  id: string;
  author_name: string;
  rating: number;
  body: string | null;
  status: ReviewStatus;
  is_own: boolean;
  reported_by_me: boolean;
  created_at: string;
  updated_at: string;
};

/** Row of get_approved_tips(). */
export type ApprovedTipRow = {
  id: string;
  author_name: string;
  category: string | null;
  body: string;
  is_own: boolean;
  reported_by_me: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  origin_country: string;
  role: UserRole;
  created_at: string;
};

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  user_id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

type AiUsageRow = {
  id: string;
  user_id: string;
  feature: AiFeature;
  created_at: string;
};

type ExchangeRateRow = {
  id: string;
  base: string;
  quote: string;
  rate: number;
  fetched_at: string;
  source: string;
};

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "id"> & Optional<Omit<ProfileRow, "id">>;
        Update: Optional<ProfileRow>;
        Relationships: [];
      };
      medicines: {
        Row: ContentRow & RequiredSource & MedicineFields;
        Insert: ContentInsert &
          RequiredSource &
          Pick<MedicineFields, "brand_name_pe" | "active_ingredient" | "digemid_url"> &
          Optional<MedicineFields>;
        Update: Optional<ContentRow & RequiredSource & MedicineFields>;
        Relationships: [VerifiedByRelationship<"medicines">];
      };
      foods: {
        Row: ContentRow & FoodFields;
        Insert: ContentInsert & Pick<FoodFields, "name"> & Optional<FoodFields>;
        Update: Optional<ContentRow & FoodFields>;
        Relationships: [VerifiedByRelationship<"foods">];
      };
      places: {
        Row: ContentRow & PlaceFields;
        Insert: ContentInsert &
          Pick<PlaceFields, "name" | "category"> &
          Optional<PlaceFields>;
        Update: Optional<ContentRow & PlaceFields>;
        Relationships: [VerifiedByRelationship<"places">];
      };
      transport_routes: {
        Row: ContentRow & RequiredSource & TransportRouteFields;
        Insert: ContentInsert &
          RequiredSource &
          Pick<TransportRouteFields, "name" | "mode"> &
          Optional<TransportRouteFields>;
        Update: Optional<ContentRow & RequiredSource & TransportRouteFields>;
        Relationships: [VerifiedByRelationship<"transport_routes">];
      };
      slang_terms: {
        Row: ContentRow & SlangTermFields;
        Insert: ContentInsert &
          Pick<SlangTermFields, "term" | "meaning"> &
          Optional<SlangTermFields>;
        Update: Optional<ContentRow & SlangTermFields>;
        Relationships: [VerifiedByRelationship<"slang_terms">];
      };
      customs: {
        Row: ContentRow & CustomFields;
        Insert: ContentInsert &
          Pick<CustomFields, "title" | "body"> &
          Optional<CustomFields>;
        Update: Optional<ContentRow & CustomFields>;
        Relationships: [VerifiedByRelationship<"customs">];
      };
      reviews: {
        Row: ReviewRow;
        Insert: Pick<ReviewRow, "target_type" | "target_id" | "rating"> &
          Optional<ReviewRow>;
        Update: Optional<ReviewRow>;
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: ReportRow;
        Insert: Pick<ReportRow, "reason"> & Optional<ReportRow>;
        Update: Optional<ReportRow>;
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_tip_id_fkey";
            columns: ["tip_id"];
            isOneToOne: false;
            referencedRelation: "tips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tips: {
        Row: TipRow;
        Insert: Pick<TipRow, "body"> & Optional<TipRow>;
        Update: Optional<TipRow>;
        Relationships: [
          {
            foreignKeyName: "tips_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: ConversationRow;
        Insert: Optional<ConversationRow>;
        Update: Optional<ConversationRow>;
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: Pick<ChatMessageRow, "role" | "content" | "conversation_id"> &
          Optional<ChatMessageRow>;
        Update: Optional<ChatMessageRow>;
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage: {
        Row: AiUsageRow;
        Insert: Pick<AiUsageRow, "user_id" | "feature"> & Optional<AiUsageRow>;
        Update: Optional<AiUsageRow>;
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: ExchangeRateRow;
        Insert: Pick<ExchangeRateRow, "base" | "quote" | "rate" | "source"> &
          Optional<ExchangeRateRow>;
        Update: Optional<ExchangeRateRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      get_reviews: {
        Args: { p_target_type: ReviewTargetType; p_target_id: string };
        Returns: ReviewListRow[];
      };
      admin_list_users: {
        Args: { p_search?: string | null; p_limit?: number };
        Returns: AdminUserRow[];
      };
      admin_set_user_role: {
        Args: { p_user_id: string; p_role: UserRole };
        Returns: UserRole;
      };
      get_approved_tips: {
        Args: { p_limit?: number };
        Returns: ApprovedTipRow[];
      };
      search_medicines: {
        Args: {
          p_brand_name: string | null;
          p_active_ingredients: string[];
          p_limit?: number;
        };
        Returns: (ContentRow & RequiredSource & MedicineFields)[];
        SetofOptions: {
          from: "*";
          to: "medicines";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      search_foods: {
        Args: { p_name: string; p_limit?: number };
        Returns: (ContentRow & FoodFields)[];
        SetofOptions: {
          from: "*";
          to: "foods";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      search_slang_terms: {
        Args: { p_terms: string[]; p_limit?: number };
        Returns: (ContentRow & SlangTermFields)[];
        SetofOptions: {
          from: "*";
          to: "slang_terms";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// ---------------------------------------------------------------------------
// Helpers (same names as the Supabase CLI output)
// ---------------------------------------------------------------------------
type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type Medicine = Tables<"medicines">;
export type Food = Tables<"foods">;
export type Place = Tables<"places">;
export type TransportRoute = Tables<"transport_routes">;
export type SlangTerm = Tables<"slang_terms">;
export type Custom = Tables<"customs">;
export type Review = Tables<"reviews">;
export type Report = Tables<"reports">;
export type Tip = Tables<"tips">;
export type Conversation = Tables<"conversations">;
export type ChatMessage = Tables<"chat_messages">;
export type AiUsage = Tables<"ai_usage">;
export type ExchangeRate = Tables<"exchange_rates">;
