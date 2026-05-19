import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadAppEnv } from "./load-env";

loadAppEnv();

function resolvePublishableKey(): string | undefined {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
}

function resolveSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function resolveSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL;
}

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const key = resolvePublishableKey();
  if (!url || !key) {
    return null;
  }
  if (!publicClient) {
    publicClient = createClient(url, key);
  }
  return publicClient;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const key = resolveSecretKey();
  if (!url || !key) {
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function getSupabaseApiStatus() {
  const url = resolveSupabaseUrl();
  return {
    configured: Boolean(url && resolvePublishableKey() && resolveSecretKey()),
    url: url ?? null,
    hasPublishableKey: Boolean(resolvePublishableKey()),
    hasSecretKey: Boolean(resolveSecretKey()),
  };
}
