export interface Customer {
  id: string;
  customer_id?: string;
  name: string;
  phone: string;
  birthday: string;
  total_visits: number;
  lifetime_spent: number;
  lifetime_spend?: number;
  last_visit: string;
  member_since?: string;
}

export interface CustomerLookupResult {
  found: boolean;
  customer?: Customer;
  message?: string;
  normalized_phone?: string;
}

export interface RegisterVisitPayload {
  customer_id?: string;
  name: string;
  phone: string;
  birthday?: string;
  amount_spent: number;
}

export interface RegisterVisitResponse {
  success: boolean;
  customer_id: string;
  message: string;
}

export interface Tenant {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  created_at: string;
  status: "active" | "trial" | "suspended";
}

export interface TrendPoint {
  date: string;
  visits: number;
  revenue: number;
}

export interface DashboardStats {
  totalCustomers: number;
  totalVisits: number;
  lifetimeRevenue: number;
  activeCoupons: number;
  previousCustomers?: number;
  previousVisits?: number;
  previousRevenue?: number;
  previousCoupons?: number;
  trend: TrendPoint[];
  recentVisits: Array<{
    id: string;
    customer_name: string;
    phone: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  total_visits: number;
  lifetime_spent: number;
}

export interface ApiSuccess<T = Record<string, unknown>> {
  success: true;
  message: string;
  data?: T;
}

export interface RedemptionResult {
  status: "SUCCESS" | "FAILED" | "NOT_FOUND";
  message: string;
  coupon_code: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  expiry_date: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_visits: number | null;
  lifetime_spend: number | null;
}
