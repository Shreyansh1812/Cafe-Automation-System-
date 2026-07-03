import { createServerFn } from "@tanstack/react-start";
import type { Customer, DashboardStats, Tenant } from "@/types";
import type { Role } from "@/lib/auth";
import { toast } from "sonner";

const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
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
          return { success: false as const, message: "Invalid email or password" };
        }
      }

      // 2. Check baristas table
      const baristas = await sql`
        SELECT b.barista_id, b.name, b.email, b.password_hash, b.tenant_id, t.business_name
        FROM baristas b
        JOIN tenants t ON b.tenant_id = t.tenant_id
        WHERE b.email = ${email} AND b.deleted_at IS NULL AND t.deleted_at IS NULL
        LIMIT 1
      `;

      if (baristas && baristas.length > 0) {
        const barista = baristas[0];
        const isMatch = await bcrypt.default.compare(data.password, barista.password_hash);
        if (!isMatch) {
          return { success: false as const, message: "Invalid email or password" };
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

      if (tenants && tenants.length > 0) {
        const tenant = tenants[0];
        if (!tenant.password_hash) {
          return { success: false as const, message: "Workspace not fully activated" };
        }
        const isMatch = await bcrypt.default.compare(data.password, tenant.password_hash);
        if (!isMatch) {
          return { success: false as const, message: "Invalid email or password" };
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

      return { success: false as const, message: "Invalid email or password" };
    } catch (err: any) {
      console.error("Database authentication error:", err);
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
  .validator((tenantId: string) => tenantId)
  .handler(async ({ data: tenantId }) => {
    const { sql } = await import("./db");

    try {
      const revenueRaw = await sql`
        SELECT 
          DATE(visit_date)::text as date,
          COALESCE(SUM(amount_spent), 0)::float as revenue,
          COUNT(*)::int as visits
        FROM visits
        WHERE tenant_id = ${tenantId} AND visit_date >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(visit_date)
        ORDER BY date ASC
      `;

      const growthRaw = await sql`
        SELECT 
          DATE(created_at)::text as date,
          COUNT(*)::int as new_customers
        FROM customers
        WHERE tenant_id = ${tenantId} AND created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL
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

      return {
        revenue: revenueRaw,
        growth: growthRaw,
        topCustomers,
      };
    } catch (err) {
      console.error("Analytics query error:", err);
      return {
        revenue: [],
        growth: [],
        topCustomers: [],
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

    try {
      const hashedPassword = await bcrypt.default.hash(data.password, 10);
      const [barista] = await sql`
        INSERT INTO baristas (
          tenant_id, name, email, phone, password_hash
        ) VALUES (
          ${data.tenant_id}, ${data.name}, ${data.email.trim().toLowerCase()}, ${data.phone}, ${hashedPassword}
        ) RETURNING barista_id
      `;
      return { success: true as const, barista_id: barista.barista_id as string };
    } catch (err: any) {
      console.error("Barista creation error:", err);
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

// Server function to check if a barista email exists
export const checkBaristaEmailServerFn = createServerFn({ method: "GET" })
  .validator((payload: { email: string; tenantId: string }) => payload)
  .handler(async ({ data }) => {
    const { sql } = await import("./db");

    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT 1 FROM baristas
          WHERE email = ${data.email.trim().toLowerCase()} AND deleted_at IS NULL
        ) as exists
      `;
      return { exists: !!result[0]?.exists };
    } catch (err) {
      console.error("Check email error:", err);
      return { exists: false };
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
    name: string;
    phone: string;
    birthday: string;
    amount_spent: number;
  }): Promise<{ success: boolean; customer_id?: string; message: string }> => {
    try {
      const storedTenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const tenant_id = payload.tenant_id || storedTenantId;
      if (!tenant_id) {
        throw new Error("No tenant found. Please log in again.");
      }

      const finalPayload = {
        ...payload,
        tenant_id,
      };

      const response = await fetch(`${N8N_BASE_URL}/cafe-entry`, {
        method: "POST",
        headers: getN8nHeaders(),
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Server returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json().catch(() => ({}));
      return {
        success: true,
        customer_id: data.customer_id || undefined,
        message: data.message || "Visit registered successfully",
      };
    } catch (err: any) {
      console.error("registerVisit failed:", err);
      const errorMessage = err?.message || "Network error / CORS issue";
      toast.error("Visit registration failed", {
        description: errorMessage,
      });
      throw err;
    }
  },

  redeemCoupon: async (payload: {
    coupon_code: string;
    tenant_id?: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const storedTenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
      const tenant_id = payload.tenant_id || storedTenantId;
      if (!tenant_id) {
        throw new Error("No tenant found. Please log in again.");
      }

      const finalPayload = {
        ...payload,
        tenant_id,
      };

      const response = await fetch(N8N_REDEMPTION_URL, {
        method: "POST",
        headers: getN8nHeaders(),
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Server returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json().catch(() => ({}));
      return {
        success: data.success ?? true,
        message: data.message || "Coupon redeemed successfully",
      };
    } catch (err: any) {
      console.error("redeemCoupon failed:", err);
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
      const res = await checkBaristaEmailServerFn({ data: { email, tenantId } });
      return res.exists;
    } catch (err) {
      console.warn("Error checking barista email:", err);
      return false;
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

  getAnalytics: async (tenantId: string) => {
    try {
      return await getAnalyticsServerFn({ data: tenantId });
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      return {
        revenue: [],
        growth: [],
        topCustomers: [],
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
