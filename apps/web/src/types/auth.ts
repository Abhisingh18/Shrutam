export interface MeResponse {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
  institution_name: string | null;
  institution_type: "school" | "college" | "university" | "coaching" | "research_lab" | null;
}

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TenantSignupInput {
  institution_name: string;
  institution_type: "school" | "college" | "university" | "coaching" | "research_lab";
  plan_tier: "starter" | "growth" | "enterprise";
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
}

export interface TenantSignupResponse {
  tenant_id: string;
  tenant_slug: string;
  institution_id: string;
  admin_user_id: string;
}
