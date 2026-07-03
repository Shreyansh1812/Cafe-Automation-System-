export interface Customer {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  total_visits: number;
  lifetime_spent: number;
  last_visit: string;
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
  trend: TrendPoint[];
  recentVisits: Array<{
    id: string;
    customer_name: string;
    phone: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface ApiSuccess<T = Record<string, unknown>> {
  success: true;
  message: string;
  data?: T;
}
