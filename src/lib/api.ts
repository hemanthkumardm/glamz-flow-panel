/**
 * Custom API client for S M Glamz backend.
 * Stores JWT in localStorage under "smg_token".
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function token() {
    return sessionStorage.getItem("smg_token");
}

async function req<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    const t = token();
    if (t) headers["Authorization"] = `Bearer ${t}`;

    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message ?? "Request failed");
    }
    // 204 No Content
    if (res.status === 204) return undefined as T;
    return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    phone: string;
    full_name: string;
    role: "admin" | "staff";
}

export async function login(phone: string, password: string): Promise<AuthUser> {
    const { token: jwt, user } = await req<{ token: string; user: AuthUser }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ phone, password }) }
    );
    sessionStorage.setItem("smg_token", jwt);
    return user;
}

export async function register(
    phone: string,
    password: string,
    full_name: string,
    role?: "admin" | "staff"
): Promise<void> {
    await req("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ phone, password, full_name, role }),
    });
}

export async function getMe(): Promise<AuthUser> {
    return req<AuthUser>("/api/auth/me");
}

export function logout() {
    sessionStorage.removeItem("smg_token");
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    wallet_balance: number;
    plan_id: string | null;
    created_at: string;
}

export const getCustomers = () => req<Customer[]>("/api/customers");
export const getCustomer = (id: string) => req<any>(`/api/customers/${id}`);
export const createCustomer = (body: Omit<Customer, "id" | "created_at">) =>
    req<Customer>("/api/customers", { method: "POST", body: JSON.stringify(body) });
export interface CustomerDeleteInfo {
    name: string;
    wallet_balance: number;
    transaction_count: number;
}

export const getCustomerDeleteInfo = (id: string) =>
    req<CustomerDeleteInfo>(`/api/customers/${id}/delete-info`);

export const deleteCustomer = (id: string) =>
    req<{ message: string; transactions_unlinked: number }>(`/api/customers/${id}`, { method: "DELETE" });

export const updateCustomer = (id: string, body: Pick<Customer, "name" | "phone" | "email">) =>
    req<Customer>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const updateCustomerPlan = (id: string, body: { plan_id: string | null; wallet_addition: number }) =>
    req<void>(`/api/customers/${id}/plan`, { method: "PUT", body: JSON.stringify(body) });

// ─── Services ────────────────────────────────────────────────────────────────

export interface Service {
    id: string;
    code: string | null;
    name: string;
    price: number;
    active: boolean;
}

export const getServices = (activeOnly = true) =>
    req<Service[]>(`/api/services${activeOnly ? "?active=true" : ""}`);
export const createService = (body: Pick<Service, "code" | "name" | "price">) =>
    req<Service>("/api/services", { method: "POST", body: JSON.stringify(body) });
export const updateService = (id: string, body: Pick<Service, "code" | "name" | "price" | "active">) =>
    req<Service>(`/api/services/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteService = (id: string) =>
    req<void>(`/api/services/${id}`, { method: "DELETE" });

// ─── Plans ───────────────────────────────────────────────────────────────────

export interface Plan {
    id: string;
    name: string;
    price: number;
    credit_value: number;
    created_at: string;
}

export const getPlans = () => req<Plan[]>("/api/plans");
export const createPlan = (body: Pick<Plan, "name" | "price" | "credit_value">) =>
    req<Plan>("/api/plans", { method: "POST", body: JSON.stringify(body) });
export const deletePlan = (id: string) =>
    req<void>(`/api/plans/${id}`, { method: "DELETE" });

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
    id: string;
    customer_id: string;
    staff_name: string;
    total: number;
    cash_amount: number;
    upi_amount: number;
    wallet_amount: number;
    subtotal: number;
    discount_amount: number;
    gst_applied: boolean;
    cgst_amount: number;
    sgst_amount: number;
    wallet_balance_after: number;
    upi_txn_id: string | null;
    voided_at?: string | null;
    voided_by?: string | null;
    created_at: string;
    items?: { service_name: string; price: number; quantity: number; staff_name?: string }[];
    customer_name?: string;
}

export const getTransactions = (params?: { from?: string; to?: string }) => {
    const qs = params
        ? "?" + new URLSearchParams(params as Record<string, string>).toString()
        : "";
    return req<Transaction[]>(`/api/transactions${qs}`);
};

export const createTransaction = (body: any) =>
    req<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(body),
    });

export const getCustomerTransactions = (customerId: string) =>
    req<any[]>(`/api/transactions?customer_id=${customerId}`);

export const voidTransaction = (id: string) =>
    req<Transaction>(`/api/transactions/${id}/void`, { method: "POST" });

// ─── Team ────────────────────────────────────────────────────────────────────

export const getTeamMembers = () => req<any[]>("/api/team");
export const setMemberRole = (userId: string, role: "admin" | "staff") =>
    req<void>(`/api/team/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
    });

// ─── Settings ────────────────────────────────────────────────────────────────

export interface StoreSettings {
    business_name: string;
    address: string;
    phone: string;
    gstin: string;
    gst_default_on: boolean;
    whatsapp_enabled: boolean;
    member_discount_pct: number;
}

export interface BroadcastStats {
    totalRegistered: number;
    totalWalkins: number;
}

export const getSettings = () => req<StoreSettings>("/api/settings");
export const saveSettings = (s: StoreSettings) => req<StoreSettings>("/api/settings", { method: "PUT", body: JSON.stringify(s) });

export const getAuthStatus = () => req<{ initialized: boolean }>("/api/auth/status");
export const getBroadcastStats = () => req<BroadcastStats>("/api/notifications/stats");
export const getAudience = () => req<{ phone: string; name: string }[]>("/api/notifications/audience");
