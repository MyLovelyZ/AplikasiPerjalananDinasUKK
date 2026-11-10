import { NativeModules, Platform } from 'react-native';
import {
  DashboardPegawai,
  KategoriBiaya,
  LaporanBiaya,
  Notifikasi,
  OpsiFormPerjalanan,
  Pengeluaran,
  Pengguna,
  Perjalanan,
  ResponsPaginasi,
  RuangLaporan,
} from './types';
import {
  addFallbackExpense,
  cancelFallbackTrip,
  createFallbackTrip,
  deleteFallbackExpense,
  fallbackOptions,
  getFallbackDashboard,
  getFallbackExpenseWorkspace,
  getFallbackTrip,
  getFallbackUnreadCount,
  getFallbackUser,
  listFallbackNotifications,
  listFallbackTrips,
  markAllFallbackNotificationsRead,
  markFallbackNotificationRead,
  submitFallbackExpenseReportByTrip,
  submitFallbackTrip,
  updateFallbackTrip,
  updateFallbackUser,
} from './fallbackData';

function detectMetroHostIp(): string {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Fallback below
  }
  return '192.168.1.10';
}

export const CURRENT_LAN_IP = detectMetroHostIp();

const DEFAULT_API_URL =
  Platform.OS === 'web'
    ? 'http://127.0.0.1:8000/api'
    : `http://${CURRENT_LAN_IP}:8000/api`;

let currentApiUrl = DEFAULT_API_URL;
let authToken: string | null = null;
let offlineFallbackActive = false;

// In-memory cache supaya pindah tab instan (0ms spinner)
let cachedDashboard: DashboardPegawai | null = null;
let cachedOptions: OpsiFormPerjalanan | null = null;

export function getApiUrl(): string {
  return currentApiUrl;
}

export function setApiUrl(url: string): void {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed) {
    currentApiUrl = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    offlineFallbackActive = false;
  }
}

export function getCachedDashboard(): DashboardPegawai | null {
  return cachedDashboard;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  isNetworkError?: boolean;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    isNetworkError?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.isNetworkError = isNetworkError;
  }

  get firstError(): string {
    if (this.errors) {
      for (const key of Object.keys(this.errors)) {
        const list = this.errors[key];
        if (Array.isArray(list) && list.length > 0) {
          return list[0];
        }
      }
    }
    return this.message;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isMultipart = false
): Promise<T> {
  if (offlineFallbackActive) {
    throw new ApiError('Offline mode active', 0, undefined, true);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      reject(new Error('REQUEST_TIMEOUT'));
    }, 1000);
  });

  let response: Response;
  try {
    response = await Promise.race([
      fetch(`${currentApiUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);
  } catch {
    if (timeoutId) clearTimeout(timeoutId);
    offlineFallbackActive = true;
    throw new ApiError(
      `Gagal terhubung ke server (${currentApiUrl}).`,
      0,
      undefined,
      true
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Permintaan gagal (${response.status}).`,
      response.status,
      data?.errors,
      false
    );
  }

  return data as T;
}

// ==========================================
// 1. AUTENTIKASI & PROFIL
// ==========================================

export async function apiLogin(
  email: string,
  password: string
): Promise<{ token: string; user: Pengguna }> {
  offlineFallbackActive = false;
  try {
    const res = await request<{
      token?: string;
      user?: Pengguna;
      data?: { token: string; user: Pengguna };
    }>('/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        platform: 'web',
        device_name: 'dinasgo-mobile-rn',
      }),
    });

    const token = res.token ?? res.data?.token ?? '';
    const user = (res.user ?? res.data?.user)!;
    authToken = token;
    return { token, user };
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const normalized = email.trim().toLowerCase();
      if (password !== 'password') {
        throw new ApiError('Email atau kata sandi tidak sesuai.', 422);
      }
      if (
        normalized &&
        !normalized.endsWith('@citramandiri.test')
      ) {
        throw new ApiError('Akun tidak ditemukan.', 422);
      }
      authToken = 'local-demo-token-citramandiri';
      const user = getFallbackUser(normalized);
      cachedDashboard = getFallbackDashboard();
      cachedOptions = fallbackOptions;
      return { token: authToken, user };
    }
    throw err;
  }
}

export async function apiLogout(): Promise<void> {
  try {
    if (!offlineFallbackActive) {
      await request('/logout', { method: 'POST' });
    }
  } catch {
    // ignore
  } finally {
    authToken = null;
    cachedDashboard = null;
  }
}

export async function apiUpdateProfile(payload: {
  name: string;
  phone?: string | null;
  position?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  bank_account_holder?: string | null;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}): Promise<{ data: Pengguna; message?: string }> {
  try {
    const res = await request<{ data: Pengguna; message?: string }>(
      '/profile',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: payload.name,
          phone: payload.phone,
          position: payload.position,
          bank_name: payload.bank_name,
          bank_account_number: payload.bank_account_number,
          bank_account_name:
            payload.bank_account_name ?? payload.bank_account_holder,
          current_password: payload.current_password,
          password: payload.password,
          password_confirmation: payload.password_confirmation,
        }),
      }
    );
    return { data: res.data ?? getFallbackUser(), message: res.message };
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      if (payload.password) {
        if (payload.password !== payload.password_confirmation) {
          throw new ApiError('Konfirmasi kata sandi baru tidak cocok.', 422);
        }
        return {
          data: getFallbackUser(),
          message: 'Kata sandi berhasil diperbarui.',
        };
      }
      const updated = updateFallbackUser({
        name: payload.name,
        phone: payload.phone ?? null,
        bank_name: payload.bank_name ?? null,
        bank_account_number: payload.bank_account_number ?? null,
        bank_account_name: payload.bank_account_name ?? null,
      });
      return { data: updated, message: 'Profil berhasil diperbarui.' };
    }
    throw err;
  }
}

// ==========================================
// 2. DASHBOARD & PERJALANAN KARYAWAN
// ==========================================

export async function apiEmployeeDashboard(): Promise<DashboardPegawai> {
  try {
    const res = await request<any>('/employee/dashboard');
    const data: DashboardPegawai = res?.data ?? res;
    cachedDashboard = data;
    return data;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const fb = getFallbackDashboard();
      cachedDashboard = fb;
      return fb;
    }
    throw err;
  }
}

export async function apiEmployeeRequests(params?: {
  status?: string;
  search?: string;
  year?: number | string;
  page?: number;
  per_page?: number;
}): Promise<ResponsPaginasi<Perjalanan>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.year) qs.set('year', String(params.year));
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : '';

  try {
    return await request<ResponsPaginasi<Perjalanan>>(
      `/employee/requests${query}`
    );
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return listFallbackTrips(params);
    }
    throw err;
  }
}

export async function apiEmployeeRequestOptions(): Promise<OpsiFormPerjalanan> {
  if (cachedOptions) {
    return cachedOptions;
  }
  try {
    const res = await request<any>('/employee/requests/create');
    const opts: OpsiFormPerjalanan = res?.data ?? res;
    cachedOptions = opts;
    return opts;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      cachedOptions = fallbackOptions;
      return fallbackOptions;
    }
    throw err;
  }
}

export async function apiEmployeeRequestDetail(
  id: number
): Promise<Perjalanan> {
  try {
    const res = await request<any>(`/employee/requests/${id}`);
    return res?.data ?? res;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return getFallbackTrip(id);
    }
    throw err;
  }
}

export async function apiEmployeeRequestEdit(
  id: number
): Promise<{ travel_request: Perjalanan; options: OpsiFormPerjalanan }> {
  try {
    const res = await request<any>(`/employee/requests/${id}/edit`);
    const data = res?.data ?? res;
    if (data?.travel_request && data?.options) {
      cachedOptions = data.options;
      return data;
    }
    const [detail, opts] = await Promise.all([
      apiEmployeeRequestDetail(id),
      apiEmployeeRequestOptions(),
    ]);
    return { travel_request: detail, options: opts };
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return {
        travel_request: getFallbackTrip(id),
        options: fallbackOptions,
      };
    }
    throw err;
  }
}

export async function apiCreateEmployeeRequest(
  payload: Record<string, any>
): Promise<any> {
  try {
    const res = await request<any>('/employee/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const created = createFallbackTrip(payload);
      cachedDashboard = getFallbackDashboard();
      return created;
    }
    throw err;
  }
}

export async function apiUpdateEmployeeRequest(
  id: number,
  payload: Record<string, any>
): Promise<any> {
  try {
    const res = await request<any>(`/employee/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const updated = updateFallbackTrip(id, payload);
      cachedDashboard = getFallbackDashboard();
      return updated;
    }
    throw err;
  }
}

export async function apiSubmitEmployeeRequest(
  id: number
): Promise<{ data: Perjalanan }> {
  try {
    const res = await request<any>(`/employee/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ submit: true }),
    });
    return { data: res?.data ?? res };
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const submitted = submitFallbackTrip(id);
      cachedDashboard = getFallbackDashboard();
      return { data: submitted };
    }
    throw err;
  }
}

export async function apiCancelEmployeeRequest(
  id: number,
  reason?: string
): Promise<{ data: Perjalanan }> {
  try {
    const res = await request<any>(`/employee/requests/${id}`, {
      method: 'DELETE',
    });
    return { data: res?.data ?? res };
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const cancelled = cancelFallbackTrip(id, reason);
      cachedDashboard = getFallbackDashboard();
      return { data: cancelled };
    }
    throw err;
  }
}

// ==========================================
// 3. LAPORAN PENGELUARAN (EXPENSE REPORT)
// ==========================================

export async function apiEmployeeExpenses(
  tripId: number
): Promise<RuangLaporan> {
  try {
    const res = await request<any>(
      `/employee/requests/${tripId}/expenses`
    );
    return res?.data ?? res;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return getFallbackExpenseWorkspace(tripId);
    }
    throw err;
  }
}

export async function apiAddExpense(
  tripId: number,
  input: {
    category: KategoriBiaya;
    expense_date: string;
    description: string;
    amount: number;
    receipt?: File | null;
  }
): Promise<Pengeluaran> {
  try {
    const form = new FormData();
    form.append('expenses[0][category]', input.category);
    form.append('expenses[0][expense_date]', input.expense_date);
    form.append('expenses[0][description]', input.description);
    form.append('expenses[0][amount]', String(Math.round(input.amount)));
    if (input.receipt) {
      form.append('expenses[0][receipt]', input.receipt as any);
    }

    const res = await request<any>(
      `/employee/requests/${tripId}/expenses`,
      {
        method: 'POST',
        body: form,
      },
      true
    );
    return res?.data ?? res;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return addFallbackExpense(tripId, input);
    }
    throw err;
  }
}

export async function apiDeleteExpense(
  tripId: number,
  expenseId: number
): Promise<void> {
  try {
    await request(`/employee/requests/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      deleteFallbackExpense(tripId, expenseId);
      return;
    }
    throw err;
  }
}

export async function apiSubmitExpenseReport(
  tripId: number,
  summary: string
): Promise<LaporanBiaya> {
  try {
    const res = await request<any>(
      `/employee/requests/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({ summary, submit: true }),
      }
    );
    return res?.data ?? res;
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      const submitted = submitFallbackExpenseReportByTrip(tripId, summary);
      cachedDashboard = getFallbackDashboard();
      return submitted;
    }
    throw err;
  }
}

// ==========================================
// 4. NOTIFIKASI
// ==========================================

export async function apiNotifications(params?: {
  unread?: boolean;
}): Promise<{ data: Notifikasi[]; unread_count?: number }> {
  const qs = params?.unread ? '?unread=1' : '';
  try {
    return await request<{ data: Notifikasi[]; unread_count?: number }>(
      `/notifications${qs}`
    );
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return listFallbackNotifications(params);
    }
    throw err;
  }
}

export async function apiNotificationUnreadCount(): Promise<number> {
  try {
    const res = await request<any>('/notifications/unread-count');
    return Number(res?.unread_count ?? res?.data?.count ?? res?.count ?? 0);
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      return getFallbackUnreadCount();
    }
    return 0;
  }
}

export async function apiMarkNotificationRead(
  id: string | number
): Promise<void> {
  try {
    await request(`/notifications/${id}/read`, { method: 'POST' });
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      markFallbackNotificationRead(id);
      return;
    }
    throw err;
  }
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  try {
    await request('/notifications/read-all', { method: 'POST' });
  } catch (err: any) {
    if (err instanceof ApiError && err.isNetworkError) {
      markAllFallbackNotificationsRead();
      return;
    }
    throw err;
  }
}
