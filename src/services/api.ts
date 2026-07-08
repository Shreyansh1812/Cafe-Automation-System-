import { createServerFn } from "@tanstack/react-start";
import type { Customer, CustomerLookupResult, DashboardStats, Tenant, TopCustomer, RedemptionResult } from "@/types";
import type { Role } from "@/lib/auth";
import { toast } from "sonner";
import { normalizePhone } from "@/utils/phone";

const metaEnv = (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {}) as any;
const N8N_BASE_URL = metaEnv.VITE_N8N_WEBHOOK_BASE_URL || process.env.VITE_N8N_WEBHOOK_BASE_URL || "http://localhost:5678/webhook";
const N8N_REDEMPTION_URL = metaEnv.VITE_N8N_REDEMPTION_WEBHOOK_URL || process.env.VITE_N8N_REDEMPTION_WEBHOOK_URL || `${N8N_BASE_URL}/redemption`;
const N8N_HEADER_NAME = metaEnv.VITE_N8N_HEADER_NAME || process.env.VITE_N8N_HEADER_NAME || "Agency-Token";
const N8N_HEADER_VALUE = metaEnv.VITE_N8N_HEADER_VALUE || process.env.VITE_N8N_HEADER_VALUE || "181204";

const getN8nHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (N8N_HEADER_NAME && N8N_HEADER_VALUE) {
    headers[N8N_HEADER_NAME] = N8N_HEADER_VALUE;
  }
  return headers;
};

/**
 * Helper function to call n8n webhook with proper CORS, proxy, and logging handling.
 * Resolves to the Vite proxy endpoint (/webhook/...) on the browser client,
 * and the absolute N8N local URL on the Node.js server (SSR / Server Functions).
 */
const callN8nWebhook = async (path: string, payload: any): Promise<any> => {
  const isServer = typeof window === 'undefined';
  
  // Base path formatting: normalize path (ensure it doesn't duplicate '/webhook')
  const relativePath = path.startsWith('/webhook') ? path.replace(/^\/webhook/, '') : path;
  
  // Determine target URL based on execution context:
  // Client (browser) routes through Vite proxy at /webhook
  // Server (SSR/ServerFn) fetches the direct n8n URL
  const url = isServer
    ? `${N8N_BASE_URL}${relativePath}`
    : `/webhook${relativePath}`;

  console.log(`[DEBUG] calling n8n webhook (${isServer ? 'server-side' : 'client-side'}):`, {
    url,
    payload,
    origin: typeof window !== 'undefined' ? window.location.origin : 'SSR-Server',
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getN8nHeaders(),
      body: JSON.stringify(payload),
    });

    console.log('[DEBUG] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[DEBUG] Webhook success:', data);
    return data;
  } catch (error: any) {
    console.error('[ERROR] Fetch failed:', error);
    
    // Provide user-friendly error messages for network connectivity issues
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Please ensure n8n is running and CORS is configured.');
    }
    throw error;
  }
};

export type LoginResult =
  | { success: true; role: Role; tenant_id?: string; name?: string; email: string; business_name?: string }
  | { success: false; message: string };

// =========================================================================
// SERVER-SIDE DATABASE FUNCTIONS (Safe from browser exposure)
// =========================================================================

// Server function for secure database authentication
export const loginServerFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");
    const bcrypt = await import("bcryptjs");

    console.log('[DIAGNOSTIC] Login attempt:', {
        email: data.email,
        password_received: data.password ? 'YES' : 'NO',
        password_length: data.password ? data.password.length : 0
    });

    try {
      const email = data.email.trim().toLowerCase();
      
      // 1. Check super admin first
      if (email === "shreyansh@admin.com") {
        if (data.password === "demo") {
          return {
            success: true as const,
            role: "super_admin" as const,
            tenant_id: undefined,
            name: "Super Admin",
            email: "shreyansh@admin.com",
          };
        } else {
          return { success: false as const, message: "Incorrect password. Please try again." };
        }
      }

      // 2. Check baristas table (only active baristas can login)
      const baristas = await sql`
        SELECT b.barista_id, b.name, b.email, b.password_hash, b.tenant_id, t.business_name
        FROM baristas b
        JOIN tenants t ON b.tenant_id = t.tenant_id
        WHERE b.email = ${email} AND b.deleted_at IS NULL AND t.deleted_at IS NULL
        LIMIT 1
      `;

      console.log('[DIAGNOSTIC] Barista query result:', {
          found: baristas && baristas.length > 0,
          hash_present: baristas?.[0]?.password_hash ? 'YES' : 'NO',
          hash_length: baristas?.[0]?.password_hash?.length || 0,
          hash_start: baristas?.[0]?.password_hash?.substring(0, 10) || 'N/A'
      });

      if (baristas && baristas.length > 0) {
        const barista = baristas[0];
        
        console.log('[DIAGNOSTIC] Comparing passwords for barista:', {
            email: barista.email,
            hash_length: barista.password_hash.length,
            is_valid_bcrypt: barista.password_hash.startsWith('$2b$')
        });

        const isMatch = await bcrypt.default.compare(data.password, barista.password_hash);
        
        console.log('[DIAGNOSTIC] Password comparison result:', {
            isMatch,
            email: barista.email
        });

        if (!isMatch) {
          return { success: false as const, message: "Incorrect password. Please try again." };
        }
        return {
          success: true as const,
          role: "barista" as const,
          tenant_id: barista.tenant_id,
          name: barista.name,
          email: barista.email,
          business_name: barista.business_name,
        };
      }

      // 3. Check tenants table
      const tenants = await sql`
        SELECT tenant_id, business_name, owner_name, email, password_hash
        FROM tenants
        WHERE email = ${email} AND deleted_at IS NULL
        LIMIT 1
      `;

      console.log('[DIAGNOSTIC] Tenant query result:', {
          found: tenants && tenants.length > 0,
          hash_present: tenants?.[0]?.password_hash ? 'YES' : 'NO',
          hash_length: tenants?.[0]?.password_hash?.length || 0,
          hash_start: tenants?.[0]?.password_hash?.substring(0, 10) || 'N/A'
      });

      if (tenants && tenants.length > 0) {
        const tenant = tenants[0];
        if (!tenant.password_hash) {
          console.log('[DIAGNOSTIC] Tenant uses Google Sign-In');
          return { success: false as const, message: "This account uses Google Sign-In. Please use Google to log in." };
        }

        console.log('[DIAGNOSTIC] Comparing passwords for tenant:', {
            email: tenant.email,
            hash_length: tenant.password_hash.length,
            is_valid_bcrypt: tenant.password_hash.startsWith('$2b$')
        });

        const isMatch = await bcrypt.default.compare(data.password, tenant.password_hash);

        console.log('[DIAGNOSTIC] Password comparison result:', {
            isMatch,
            email: tenant.email
        });

        if (!isMatch) {
          return { success: false as const, message: "Incorrect password. Please try again." };
        }
        return {
          success: true as const,
          role: "owner" as const,
          tenant_id: tenant.tenant_id,
          name: tenant.owner_name || tenant.business_name,
          email: tenant.email,
          business_name: tenant.business_name,
        };
      }

      // 4. No account found
      return { success: false as const, message: "No account found with this email. Please sign up first." };
    } catch (err: any) {
      console.error("[DIAGNOSTIC] Database authentication error:", err);
      return { success: false as const, message: "Internal server authentication error" };
    }
  });

// Server function for Google Authentication
export const loginWithGoogleServerFn = createServerFn({ method: "POST" })
  .validator((data: { credential?: string; isMock?: boolean; mockEmail?: string; mockName?: string }) => data)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");

    try {
      let email = "";
      let name = "";
      let google_id = "";

      if (data.isMock) {
        // Simulation Mode
        email = (data.mockEmail || "owner@testcafe.com").trim().toLowerCase();
        name = data.mockName || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        google_id = `mock-google-id-${email}`;
      } else {
        // Real Google Login verification
        if (!data.credential) {
          return { success: false as const, message: "No Google credential provided." };
        }
        
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${data.credential}`);
        if (!tokenRes.ok) {
          return { success: false as const, message: "Invalid Google Identity token signature" };
        }
        const payload = await tokenRes.json();
        
        // Verify client ID matches
        const clientId = process.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
        if (payload.aud !== clientId) {
          return { success: false as const, message: "Google token audience mismatch" };
        }

        email = payload.email.trim().toLowerCase();
        google_id = payload.sub;
        name = payload.name || "";
      }

      // Check if tenant exists by google_id or email
      const tenants = await sql`
        SELECT tenant_id, business_name, owner_name, email, google_id, auth_provider
        FROM tenants
        WHERE google_id = ${google_id} OR email = ${email}
        LIMIT 1
      `;

      if (tenants && tenants.length > 0) {
        const tenant = tenants[0];

        // Link Google ID if it isn't linked yet
        if (!tenant.google_id) {
          await sql`
            UPDATE tenants
            SET google_id = ${google_id}, auth_provider = 'google'
            WHERE tenant_id = ${tenant.tenant_id}
          `;
        }

        return {
          success: true as const,
          isNewUser: false as const,
          role: "owner" as const,
          tenant_id: tenant.tenant_id,
          name: tenant.owner_name || tenant.business_name,
          email: tenant.email,
          business_name: tenant.business_name,
        };
      }

      // New owner - redirect to Complete Registration page
      return {
        success: true as const,
        isNewUser: true as const,
        email,
        name,
        google_id,
      };
    } catch (err: any) {
      console.error("Google login server function error:", err);
      return { success: false as const, message: "Internal server Google authentication error" };
    }
  });

// Server function for completing Google registration (New Owner self-onboarding)
export const completeRegistrationServerFn = createServerFn({ method: "POST" })
  .validator((data: {
    email: string;
    name: string;
    google_id: string;
    business_name: string;
    phone: string;
    address: string;
    password?: string;
  }) => data)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");
    const bcrypt = await import("bcryptjs");

    try {
      const email = data.email.trim().toLowerCase();
      const passwordHash = data.password ? await bcrypt.default.hash(data.password, 10) : null;

      // Double check if tenant exists
      const existing = await sql`
        SELECT tenant_id FROM tenants WHERE email = ${email} LIMIT 1
      `;

      if (existing && existing.length > 0) {
        return { success: false as const, message: "A tenant workspace with this email already exists." };
      }

      const [tenant] = await sql`
        INSERT INTO tenants (
          business_name, owner_name, email, phone, status, password_hash, address, google_id, auth_provider
        ) VALUES (
          ${data.business_name}, ${data.name}, ${email}, ${data.phone}, 'active', ${passwordHash}, ${data.address || null}, ${data.google_id}, 'google'
        ) RETURNING tenant_id, business_name, owner_name, email
      `;

      return {
        success: true as const,
        role: "owner" as const,
        tenant_id: tenant.tenant_id as string,
        name: tenant.owner_name || tenant.business_name,
        email: tenant.email,
        business_name: tenant.business_name as string,
      };
    } catch (err: any) {
      console.error("Complete registration server function error:", err);
      return { success: false as const, message: err.message || "Failed to register tenant workspace" };
    }
  });

// Server function for retrieving dashboard metrics
export const getDashboardStatsServerFn = createServerFn({ method: "GET" })
  .validator((tenantId: string) => tenantId)
  .handler(async ({ data: tenantId }) => {
    const { sql } = await import("./db");

    try {
      // 1. Get total customers count
      const [custCount] = await sql`
        SELECT COUNT(*)::int as count FROM customers 
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
      `;

      // 2. Get total visits count
      const [visitCount] = await sql`
        SELECT COUNT(*)::int as count FROM visits 
        WHERE tenant_id = ${tenantId}
      `;

      // 3. Get lifetime revenue
      const [revSum] = await sql`
        SELECT COALESCE(SUM(amount_spent), 0)::float as revenue 
        FROM visits 
        WHERE tenant_id = ${tenantId}
      `;

      // 4. Get active coupons count
      const [couponCount] = await sql`
        SELECT COUNT(*)::int as count FROM active_coupons 
        WHERE tenant_id = ${tenantId} AND is_redeemed = false AND expires_at > NOW()
      `;

      // 4.5. Get previous period stats (for percentage calculations)
      const [prevCustCount] = await sql`
        SELECT COUNT(*)::int as count FROM customers 
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at < NOW() - INTERVAL '30 days'
      `;

      const [prevVisitCount] = await sql`
        SELECT COUNT(*)::int as count FROM visits 
        WHERE tenant_id = ${tenantId} AND visit_date < NOW() - INTERVAL '30 days'
      `;

      const [prevRevSum] = await sql`
        SELECT COALESCE(SUM(amount_spent), 0)::float as revenue 
        FROM visits 
        WHERE tenant_id = ${tenantId} AND visit_date < NOW() - INTERVAL '30 days'
      `;

      const [prevCouponCount] = await sql`
        SELECT COUNT(*)::int as count FROM active_coupons 
        WHERE tenant_id = ${tenantId} 
          AND created_at < NOW() - INTERVAL '30 days'
          AND (is_redeemed = false OR redeemed_at > NOW() - INTERVAL '30 days')
          AND (expires_at > NOW() - INTERVAL '30 days' OR expires_at IS NULL)
      `;

      // 5. Get 7-day trend data
      const trendRaw = await sql`
        SELECT 
          TO_CHAR(visit_date, 'Dy') as date,
          COUNT(*)::int as visits,
          COALESCE(SUM(amount_spent), 0)::float as revenue,
          DATE(visit_date) as d
        FROM visits
        WHERE tenant_id = ${tenantId} AND visit_date >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(visit_date), TO_CHAR(visit_date, 'Dy'), visit_date
        ORDER BY d ASC
      `;

      // 6. Get recent visits (last 6)
      const recentVisitsRaw = await sql`
        SELECT 
          v.visit_id as id,
          c.name as customer_name,
          c.phone,
          v.amount_spent::float as amount,
          v.visit_date as timestamp
        FROM visits v
        JOIN customers c ON v.customer_id = c.customer_id
        WHERE v.tenant_id = ${tenantId}
        ORDER BY v.visit_date DESC
        LIMIT 6
      `;

      const trend = trendRaw.map((t) => ({
        date: t.date,
        visits: t.visits,
        revenue: t.revenue,
      }));

      const recentVisits = recentVisitsRaw.map((v) => {
        const timeDiff = Date.now() - new Date(v.timestamp).getTime();
        const mins = Math.floor(timeDiff / 60000);
        let timeStr = "just now";
        if (mins > 0 && mins < 60) {
          timeStr = `${mins}m ago`;
        } else if (mins >= 60 && mins < 1440) {
          timeStr = `${Math.floor(mins / 60)}h ago`;
        } else if (mins >= 1440) {
          timeStr = `${Math.floor(mins / 1440)}d ago`;
        }

        return {
          id: v.id,
          customer_name: v.customer_name,
          phone: v.phone,
          amount: v.amount,
          timestamp: timeStr,
        };
      });

      return {
        totalCustomers: custCount?.count || 0,
        totalVisits: visitCount?.count || 0,
        lifetimeRevenue: revSum?.revenue || 0,
        activeCoupons: couponCount?.count || 0,
        previousCustomers: prevCustCount?.count || 0,
        previousVisits: prevVisitCount?.count || 0,
        previousRevenue: prevRevSum?.revenue || 0,
        previousCoupons: prevCouponCount?.count || 0,
        trend,
        recentVisits,
      };
    } catch (err: any) {
      console.error("Dashboard stats query error:", err);
      // Graceful fallback to avoid dashboard crashes
      return {
        totalCustomers: 0,
        totalVisits: 0,
        lifetimeRevenue: 0,
        activeCoupons: 0,
        previousCustomers: 0,
        previousVisits: 0,
        previousRevenue: 0,
        previousCoupons: 0,
        trend: [],
        recentVisits: [],
      };
    }
  });

// Server function for customer directory
export const getCustomersServerFn = createServerFn({ method: "GET" })
  .validator((tenantId: string) => tenantId)
  .handler(async ({ data: tenantId }) => {
    const { sql } = await import("./db");

    try {
      const customers = await sql`
        SELECT 
          customer_id as id,
          name,
          phone,
          COALESCE(birthday::text, '') as birthday,
          total_visits,
          COALESCE(lifetime_spend, 0)::float as lifetime_spent,
          COALESCE(last_visit::text, '') as last_visit
        FROM customers
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY last_visit DESC NULLS LAST
      `;
      return customers as unknown as Customer[];
    } catch (err) {
      console.error("Customers query error:", err);
      return [];
    }
  });

// Server function for analytics data
export const getAnalyticsServerFn = createServerFn({ method: "GET" })
  .validator((data: { tenantId: string; range: '7d' | '30d' | '90d' }) => data)
  .handler(async ({ data }) => {
    const { tenantId, range } = data;
    const { sql } = await import("./db");

    try {
      const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
      const intervalStr = `${days} days`;

      const revenueRaw = await sql`
        SELECT 
          DATE(visit_date)::text as date,
          COALESCE(SUM(amount_spent), 0)::float as revenue,
          COUNT(*)::int as visits
        FROM visits
        WHERE tenant_id = ${tenantId} AND visit_date >= NOW() - CAST(${intervalStr} AS interval)
        GROUP BY DATE(visit_date)
        ORDER BY date ASC
      `;

      const growthRaw = await sql`
        SELECT 
          DATE(created_at)::text as date,
          COUNT(*)::int as new_customers
        FROM customers
        WHERE tenant_id = ${tenantId} AND created_at >= NOW() - CAST(${intervalStr} AS interval) AND deleted_at IS NULL
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const topCustomers = await sql`
        SELECT 
          customer_id as id,
          name,
          phone,
          total_visits,
          COALESCE(lifetime_spend, 0)::float as lifetime_spent
        FROM customers
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY lifetime_spend DESC NULLS LAST
        LIMIT 5
      `;

      const [activeCustRes] = await sql`
        SELECT COUNT(DISTINCT customer_id)::int as count 
        FROM visits 
        WHERE tenant_id = ${tenantId} AND visit_date >= NOW() - CAST(${intervalStr} AS interval)
      `;

      const totalRevenue = revenueRaw.reduce((sum: number, r: any) => sum + (r.revenue || 0), 0);
      const totalVisits = revenueRaw.reduce((sum: number, r: any) => sum + (r.visits || 0), 0);
      const avgSpend = totalVisits > 0 ? totalRevenue / totalVisits : 0;
      const activeCustomers = activeCustRes?.count || 0;

      return {
        revenue: revenueRaw,
        growth: growthRaw,
        topCustomers: topCustomers as unknown as TopCustomer[],
        totalRevenue,
        totalVisits,
        avgSpend,
        activeCustomers,
      };
    } catch (err) {
      console.error("Analytics query error:", err);
      return {
        revenue: [],
        growth: [],
        topCustomers: [] as TopCustomer[],
        totalRevenue: 0,
        totalVisits: 0,
        avgSpend: 0,
        activeCustomers: 0,
      };
    }
  });

// Server function for admin directory
export const getTenantsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { sql } = await import("./db");

    try {
      const tenants = await sql`
        SELECT 
          tenant_id as id,
          business_name,
          COALESCE(owner_name, '') as owner_name,
          COALESCE(email, '') as email,
          COALESCE(phone, '') as phone,
          created_at::text,
          status
        FROM tenants
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
      `;
      return tenants as unknown as Tenant[];
    } catch (err) {
      console.error("Tenants query error:", err);
      return [];
    }
  });

// Server function for onboarding new tenants
export const onboardTenantServerFn = createServerFn({ method: "POST" })
  .validator((payload: {
    business_name: string;
    owner_name: string;
    email: string;
    phone: string;
    password?: string;
    address?: string;
  }) => payload)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");
    const bcrypt = await import("bcryptjs");

    try {
      const passwordHash = data.password ? await bcrypt.default.hash(data.password, 10) : null;
      const [tenant] = await sql`
        INSERT INTO tenants (
          business_name, owner_name, email, phone, status, password_hash, address
        ) VALUES (
          ${data.business_name}, ${data.owner_name}, ${data.email.trim().toLowerCase()}, ${data.phone}, 'active', ${passwordHash}, ${data.address || null}
        ) RETURNING tenant_id
      `;
      return { success: true as const, tenant_id: tenant.tenant_id as string };
    } catch (err: any) {
      console.error("Tenant onboarding error:", err);
      return { success: false as const, message: err.message || "Failed to onboard tenant" };
    }
  });

// Server function for creating new baristas
export const createBaristaServerFn = createServerFn({ method: "POST" })
  .validator((payload: {
    tenant_id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => payload)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");
    const bcrypt = await import("bcryptjs");

    console.log('[DIAGNOSTIC] Barista creation started:', {
        tenant_id: data.tenant_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password_received: data.password ? 'YES' : 'NO',
        password_length: data.password ? data.password.length : 0
    });

    try {
      const email = data.email.trim().toLowerCase();

      // Check if an active barista exists with this email
      const activeBaristas = await sql`
        SELECT barista_id FROM baristas
        WHERE email = ${email} AND tenant_id = ${data.tenant_id} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (activeBaristas.length > 0) {
        return {
          success: false as const,
          code: "DUPLICATE_EMAIL",
          message: "This email is already registered to an active barista. Please use a different email."
        };
      }

      // Check if a soft-deleted barista exists with this email
      const deletedBaristas = await sql`
        SELECT barista_id FROM baristas
        WHERE email = ${email} AND tenant_id = ${data.tenant_id} AND deleted_at IS NOT NULL
        LIMIT 1
      `;

      const hashedPassword = await bcrypt.default.hash(data.password, 10);

      console.log('[DIAGNOSTIC] Password hashed:', {
          hash_length: hashedPassword.length,
          hash_start: hashedPassword.substring(0, 10) + '...',
          is_valid_bcrypt: hashedPassword.startsWith('$2b$')
      });

      if (deletedBaristas.length > 0) {
        // Reactivate the soft-deleted record
        const baristaId = deletedBaristas[0].barista_id;
        await sql`
          UPDATE baristas
          SET name = ${data.name}, phone = ${data.phone}, password_hash = ${hashedPassword},
              deleted_at = NULL, updated_at = NOW()
          WHERE barista_id = ${baristaId}
        `;

        console.log('[DIAGNOSTIC] Barista reactivated successfully:', {
            barista_id: baristaId,
            email: email
        });

        return { success: true as const, barista_id: baristaId as string };
      }

      // Create a new active record
      const [barista] = await sql`
        INSERT INTO baristas (
          tenant_id, name, email, phone, password_hash
        ) VALUES (
          ${data.tenant_id}, ${data.name}, ${email}, ${data.phone}, ${hashedPassword}
        ) RETURNING barista_id
      `;

      console.log('[DIAGNOSTIC] Barista created successfully:', {
          barista_id: barista.barista_id,
          email: email
      });

      return { success: true as const, barista_id: barista.barista_id as string };
    } catch (err: any) {
      console.error('[DIAGNOSTIC] Barista creation failed:', err);
      if (err.code === "23505" || err.message?.includes("baristas_email_key")) {
        return {
          success: false as const,
          code: "DUPLICATE_EMAIL",
          message: "This email is already registered as a barista. Please use a different email address."
        };
      }
      return { success: false as const, message: err.message || "Failed to create barista" };
    }
  });

// Server function to check if a barista email exists (returns detail on active/deleted status)
export const checkBaristaEmailServerFn = createServerFn({ method: "GET" })
  .validator((payload: { email: string; tenantId: string }) => payload)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");

    try {
      const activeResult = await sql`
        SELECT barista_id FROM baristas
        WHERE email = ${data.email.trim().toLowerCase()} AND tenant_id = ${data.tenantId} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (activeResult.length > 0) {
        return { exists: true, deleted: false, barista_id: null };
      }

      const deletedResult = await sql`
        SELECT barista_id FROM baristas
        WHERE email = ${data.email.trim().toLowerCase()} AND tenant_id = ${data.tenantId} AND deleted_at IS NOT NULL
        LIMIT 1
      `;
      if (deletedResult.length > 0) {
        return { exists: false, deleted: true, barista_id: deletedResult[0].barista_id as string };
      }

      return { exists: false, deleted: false, barista_id: null };
    } catch (err) {
      console.error("Check email error:", err);
      return { exists: false, deleted: false, barista_id: null };
    }
  });

// Server function for reactivating a soft-deleted barista
export const reactivateBaristaServerFn = createServerFn({ method: "POST" })
  .validator((payload: { baristaId: string; name: string; phone: string; password?: string }) => payload)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");
    const bcrypt = await import("bcryptjs");

    try {
      let barista;
      if (data.password) {
        const hashedPassword = await bcrypt.default.hash(data.password, 10);
        [barista] = await sql`
          UPDATE baristas
          SET deleted_at = NULL, name = ${data.name}, phone = ${data.phone}, password_hash = ${hashedPassword}, updated_at = NOW()
          WHERE barista_id = ${data.baristaId}
          RETURNING barista_id as id, name, email, phone
        `;
      } else {
        [barista] = await sql`
          UPDATE baristas
          SET deleted_at = NULL, name = ${data.name}, phone = ${data.phone}, updated_at = NOW()
          WHERE barista_id = ${data.baristaId}
          RETURNING barista_id as id, name, email, phone
        `;
      }
      return { success: true as const, barista };
    } catch (err: any) {
      console.error("Barista reactivation error:", err);
      return { success: false as const, message: err.message || "Failed to reactivate barista" };
    }
  });

// Server function for listing baristas of a cafe
export const getBaristasServerFn = createServerFn({ method: "GET" })
  .validator((tenantId: string) => tenantId)
  .handler(async ({ data: tenantId }) => {
    const { sql } = await import("./db");

    try {
      const baristas = await sql`
        SELECT barista_id as id, name, email, phone, created_at
        FROM baristas
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;
      return baristas;
    } catch (err) {
      console.error("Baristas query error:", err);
      return [];
    }
  });

// Server function for soft-deleting a barista
export const deleteBaristaServerFn = createServerFn({ method: "POST" })
  .validator((baristaId: string) => baristaId)
  .handler(async ({ data: baristaId }) => {
    const { sql } = await import("./db");

    try {
      await sql`
        UPDATE baristas
        SET deleted_at = NOW()
        WHERE barista_id = ${baristaId}
      `;
      return { success: true as const };
    } catch (err: any) {
      console.error("Barista deletion error:", err);
      return { success: false as const, message: err.message || "Failed to delete barista" };
    }
  });

// Server function for updating a barista's details
export const updateBaristaServerFn = createServerFn({ method: "POST" })
  .validator((data: { baristaId: string; name: string; email: string; phone: string }) => data)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");

    try {
      const [barista] = await sql`
        UPDATE baristas
        SET name = ${data.name}, email = ${data.email.trim().toLowerCase()}, phone = ${data.phone}, updated_at = NOW()
        WHERE barista_id = ${data.baristaId}
        RETURNING barista_id as id, name, email, phone
      `;
      return { success: true as const, barista };
    } catch (err: any) {
      console.error("Barista update error:", err);
      if (err.code === "23505" || err.message?.includes("baristas_email_key")) {
        return {
          success: false as const,
          code: "DUPLICATE_EMAIL",
          message: "This email is already registered. Please use a different email address."
        };
      }
      return { success: false as const, message: err.message || "Failed to update barista" };
    }
  });

// Server function for updating a customer's details
export const updateCustomerServerFn = createServerFn({ method: "POST" })
  .validator((data: { customerId: string; name: string; phone: string; birthday: string }) => data)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");

    try {
      const [customer] = await sql`
        UPDATE customers
        SET name = ${data.name}, phone = ${data.phone}, birthday = ${data.birthday || null}, updated_at = NOW()
        WHERE customer_id = ${data.customerId}
        RETURNING customer_id as id, name, phone, birthday, total_visits, lifetime_spend as lifetime_spent, last_visit
      `;
      return { success: true as const, customer };
    } catch (err: any) {
      console.error("Customer update error:", err);
      return { success: false as const, message: err.message || "Failed to update customer" };
    }
  });

// =========================================================================
// API CLIENT OBJECT
// =========================================================================

export const api = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await loginServerFn({ data: { email, password } });
      return res;
    } catch (err: any) {
      console.error("Login client-side error:", err);
      return { success: false, message: err?.message || "Failed to contact authorization server" };
    }
  },

  registerVisit: async (payload: {
    tenant_id?: string;
    customer_id?: string;
    name: string;
    phone: string;
    birthday: string;
    amount_spent: number;
  }): Promise<{ success: boolean; customer_id?: string; message: string }> => {
    try {
      return await registerVisit(payload);
    } catch (err: any) {
      console.error("registerVisit delegate failed:", err);
      throw err;
    }
  },

  redeemCoupon: async (payload: {
    coupon_code: string;
    tenant_id?: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await redeemCoupon(payload);
      return {
        success: res.status === "SUCCESS",
        message: res.message,
      };
    } catch (err: any) {
      console.error("redeemCoupon delegate failed:", err);
      const errorMessage = err?.message || "Network error / CORS issue";
      toast.error("Coupon redemption failed", {
        description: errorMessage,
      });
      throw err;
    }
  },

  getDashboardStats: async (tenantId: string): Promise<DashboardStats> => {
    try {
      return await getDashboardStatsServerFn({ data: tenantId });
    } catch (err: any) {
      console.error("Error loading dashboard stats:", err);
      return {
        totalCustomers: 0,
        totalVisits: 0,
        lifetimeRevenue: 0,
        activeCoupons: 0,
        trend: [],
        recentVisits: [],
      };
    }
  },

  getCustomers: async (tenantId: string): Promise<Customer[]> => {
    try {
      return await getCustomersServerFn({ data: tenantId });
    } catch (err: any) {
      console.error("Error loading customers:", err);
      return [];
    }
  },

  getTenants: async (): Promise<Tenant[]> => {
    try {
      return await getTenantsServerFn();
    } catch (err: any) {
      console.error("Error loading tenants:", err);
      return [];
    }
  },

  onboardTenant: async (payload: {
    business_name: string;
    owner_name: string;
    email: string;
    phone: string;
    password?: string;
    address?: string;
  }) => {
    try {
      return await onboardTenantServerFn({ data: payload });
    } catch (err: any) {
      console.error("Error onboarding tenant:", err);
      return { success: false as const, message: err?.message || "Failed to connect to onboarding endpoint" };
    }
  },

  createBarista: async (payload: {
    tenant_id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    try {
      return await createBaristaServerFn({ data: payload });
    } catch (err: any) {
      console.error("Error creating barista:", err);
      return { success: false as const, message: err?.message || "Failed to create barista" };
    }
  },

  checkBaristaEmail: async (email: string, tenantId: string) => {
    try {
      return await checkBaristaEmailServerFn({ data: { email, tenantId } });
    } catch (err) {
      console.warn("Error checking barista email:", err);
      return { exists: false, deleted: false, barista_id: null };
    }
  },

  reactivateBarista: async (baristaId: string, data: { name: string; phone: string; password?: string }) => {
    try {
      return await reactivateBaristaServerFn({ data: { baristaId, ...data } });
    } catch (err: any) {
      console.error("Error reactivating barista:", err);
      return { success: false as const, message: err?.message || "Failed to reactivate barista" };
    }
  },

  getBaristas: async (tenantId: string) => {
    try {
      return await getBaristasServerFn({ data: tenantId });
    } catch (err: any) {
      console.error("Error loading baristas:", err);
      return [];
    }
  },

  deleteBarista: async (baristaId: string) => {
    try {
      return await deleteBaristaServerFn({ data: baristaId });
    } catch (err: any) {
      console.error("Error deleting barista:", err);
      return { success: false as const, message: err?.message || "Failed to delete barista" };
    }
  },

  updateBarista: async (baristaId: string, data: { name: string; email: string; phone: string }) => {
    try {
      return await updateBaristaServerFn({ data: { baristaId, ...data } });
    } catch (err: any) {
      console.error("Error updating barista:", err);
      return { success: false as const, message: err?.message || "Failed to update barista" };
    }
  },

  updateCustomer: async (customerId: string, data: { name: string; phone: string; birthday: string }) => {
    try {
      return await updateCustomerServerFn({ data: { customerId, ...data } });
    } catch (err: any) {
      console.error("Error updating customer:", err);
      return { success: false as const, message: err?.message || "Failed to update customer" };
    }
  },

  getAnalytics: async (tenantId: string, range: '7d' | '30d' | '90d' = '30d') => {
    try {
      return await getAnalyticsServerFn({ data: { tenantId, range } });
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      return {
        revenue: [],
        growth: [],
        topCustomers: [],
        totalRevenue: 0,
        totalVisits: 0,
        avgSpend: 0,
        activeCustomers: 0,
      };
    }
  },

  loginWithGoogle: async (payload: { credential?: string; isMock?: boolean; mockEmail?: string; mockName?: string }) => {
    try {
      return await loginWithGoogleServerFn({ data: payload });
    } catch (err: any) {
      console.error("Error logging in with Google:", err);
      return { success: false as const, message: err?.message || "Failed to log in with Google" };
    }
  },

  completeRegistration: async (payload: {
    email: string;
    name: string;
    google_id: string;
    business_name: string;
    phone: string;
    address: string;
    password?: string;
  }) => {
    try {
      return await completeRegistrationServerFn({ data: payload });
    } catch (err: any) {
      console.error("Error completing registration:", err);
      return { success: false as const, message: err?.message || "Failed to complete registration" };
    }
  },
};

/**
 * Check if a customer exists by phone number
 * ACTUAL BACKEND: GET /api/customers/by-phone?phone=...&tenant_id=...
 */
export const checkCustomerByPhone = async (phone: string): Promise<CustomerLookupResult> => {
    const tenant_id = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null;
    
    if (!tenant_id) {
        throw new Error('No tenant found. Please log in again.');
    }

    // Normalize phone number before sending to API
    const normalizedPhone = normalizePhone(phone);

    const response = await fetch(
        `/api/customers/by-phone?phone=${encodeURIComponent(normalizedPhone)}&tenant_id=${tenant_id}`,
        {
            headers: {
                'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to check customer.');
    }

    return response.json();
};

/**
 * Register a new visit (new or existing customer)
 */
export const registerVisit = async (data: {
    customer_id?: string;
    name: string;
    phone: string;
    birthday: string;
    amount_spent: number;
}): Promise<{ success: boolean; customer_id: string; message: string }> => {
    const tenant_id = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null;
    
    if (!tenant_id) {
        throw new Error('No tenant found. Please log in again.');
    }

    const payload = {
        ...data,
        tenant_id,
        phone: normalizePhone(data.phone),
    };

    try {
        // Try calling n8n webhook directly via client proxy
        return await callN8nWebhook('/webhook/cafe-entry', payload);
    } catch (err: any) {
        console.warn("n8n webhook call failed. Triggering database fallback. Error:", err.message);
        
        // Fallback to local database visit logging via /api/visits
        const response = await fetch('/api/visits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to log visit.' }));
            throw new Error(error.message || 'Failed to log visit.');
        }

        return response.json();
    }
};

async function executeDatabaseRedemptionFallback(couponCode: string, tenantId: string): Promise<RedemptionResult> {
  console.log(`[FALLBACK] Running local database redemption fallback for coupon ${couponCode}...`);
  const { sql } = await import("./db");

  const result = await sql<RedemptionResult[]>`
    WITH updated AS (
        UPDATE active_coupons
        SET is_redeemed = TRUE,
            redeemed_at = NOW()
        WHERE coupon_code = ${couponCode}
          AND tenant_id = ${tenantId}
          AND is_redeemed = FALSE
          AND expiry_date > NOW()
        RETURNING 
            customer_id,
            coupon_code,
            is_redeemed,
            redeemed_at,
            expiry_date
    )
    SELECT 
        u.customer_id,
        u.coupon_code,
        u.is_redeemed,
        u.redeemed_at,
        u.expiry_date,
        'SUCCESS'::varchar AS status,
        'Coupon redeemed successfully!'::varchar AS message,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.total_visits,
        c.lifetime_spend
    FROM updated u
    LEFT JOIN customers c ON u.customer_id = c.customer_id

    UNION ALL

    SELECT 
        NULL::uuid AS customer_id,
        a.coupon_code,
        a.is_redeemed,
        a.redeemed_at,
        a.expiry_date,
        'FAILED'::varchar AS status,
        CASE 
            WHEN a.is_redeemed = TRUE THEN '❌ This coupon has already been redeemed.'::varchar
            WHEN a.expiry_date <= NOW() THEN '❌ This coupon has expired.'::varchar
            WHEN a.coupon_code IS NULL THEN '❌ Coupon code not found.'::varchar
            ELSE '❌ Coupon is not valid for redemption.'::varchar
        END AS message,
        NULL::varchar AS customer_name,
        NULL::varchar AS customer_phone,
        NULL::int AS total_visits,
        NULL::numeric AS lifetime_spend
    FROM active_coupons a
    WHERE a.coupon_code = ${couponCode} AND a.tenant_id = ${tenantId}
      AND NOT EXISTS (
          SELECT 1 FROM updated WHERE updated.coupon_code = a.coupon_code
      )

    UNION ALL

    SELECT 
        NULL::uuid AS customer_id,
        ${couponCode}::varchar AS coupon_code,
        FALSE AS is_redeemed,
        NULL::timestamp with time zone AS redeemed_at,
        NULL::timestamp with time zone AS expiry_date,
        'NOT_FOUND'::varchar AS status,
        '❌ Coupon code not found for this cafe.'::varchar AS message,
        NULL::varchar AS customer_name,
        NULL::varchar AS customer_phone,
        NULL::int AS total_visits,
        NULL::numeric AS lifetime_spend
    WHERE NOT EXISTS (
        SELECT 1 FROM active_coupons WHERE coupon_code = ${couponCode} AND tenant_id = ${tenantId}
    )
    AND NOT EXISTS (
        SELECT 1 FROM updated
    );
  `;

  if (!result || result.length === 0) {
    throw new Error("No response returned from redemption query.");
  }
  
  return result[0];
}

export const redeemCouponServerFn = createServerFn({ method: "POST" })
  .validator((data: { coupon_code: string; tenant_id: string }) => data)
  .handler(async ({ data }) => {
    console.log("redeemCouponServerFn handler executing on server side...");
    const payload = {
      coupon_code: data.coupon_code.trim().toUpperCase(),
      tenant_id: data.tenant_id,
    };

    try {
      console.log(`Attempting to send request to n8n webhook: ${N8N_REDEMPTION_URL}`);
      const response = await fetch(N8N_REDEMPTION_URL, {
        method: "POST",
        headers: getN8nHeaders(),
        body: JSON.stringify(payload),
      });

      const responseText = await response.text().catch(() => "");
      
      if (!response.ok) {
        // Fallback if n8n returns 404 (Webhook toggle off/not registered)
        if (response.status === 404 || responseText.includes("not registered")) {
          console.warn("n8n webhook returned 404/not registered. Falling back to direct database execution.");
          return await executeDatabaseRedemptionFallback(payload.coupon_code, payload.tenant_id);
        }
        throw new Error(`Server returned status ${response.status}: ${responseText || "Unknown error"}`);
      }

      // If response text is valid JSON, parse and return it
      try {
        const resData = JSON.parse(responseText);
        return resData as RedemptionResult;
      } catch (parseErr) {
        throw new Error(`Failed to parse n8n response as JSON: ${responseText}`);
      }
    } catch (err: any) {
      console.warn("n8n webhook call failed. Triggering database fallback. Error:", err.message);
      try {
        return await executeDatabaseRedemptionFallback(payload.coupon_code, payload.tenant_id);
      } catch (fallbackErr: any) {
        console.error("Direct database redemption fallback failed:", fallbackErr);
        throw new Error(fallbackErr?.message || "Failed to redeem coupon via database fallback");
      }
    }
  });

/**
 * Redeem a coupon (returns enhanced redemption result)
 */
export const redeemCoupon = async (data: {
    coupon_code: string;
    tenant_id?: string;
}): Promise<RedemptionResult> => {
    const tenant_id = data.tenant_id || (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null);
    
    if (!tenant_id) {
        throw new Error('No tenant found. Please log in again.');
    }

    const normalizedCode = data.coupon_code.trim().toUpperCase();
    const payload = {
        coupon_code: normalizedCode,
        tenant_id,
    };

    try {
        // Try calling n8n webhook directly via client proxy
        return await callN8nWebhook('/webhook/redemption', payload);
    } catch (err: any) {
        console.warn("n8n webhook call failed. Triggering database fallback. Error:", err.message);
        
        // Fallback to server function for direct database redemption
        return redeemCouponServerFn({
            data: {
                coupon_code: normalizedCode,
                tenant_id,
            }
        });
    }
};
