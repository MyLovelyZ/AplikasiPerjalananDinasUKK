import { Platform } from 'react-native';

// Android Emulator connects to host machine via 10.0.2.2, iOS / Web connects via localhost
const DEFAULT_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://127.0.0.1:8000/api';

let currentBaseUrl = DEFAULT_API_URL;
let currentToken: string | null = null;

export const setApiUrl = (url: string) => {
  currentBaseUrl = url.replace(/\/+$/, '');
};

export const getApiUrl = () => currentBaseUrl;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

export const getAuthToken = () => currentToken;

export interface ApiResponse<T> {
  sukses?: boolean;
  pesan?: string;
  message?: string;
  data: T;
  halaman?: {
    halaman_saat_ini: number;
    total_data: number;
    total_halaman: number;
  };
}

async function request<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    isFormData?: boolean;
  } = {}
): Promise<T> {
  const url = `${currentBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  let bodyData = options.body;
  if (!options.isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyData = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: bodyData,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      json?.message ||
      json?.pesan ||
      `Permintaan gagal dengan status ${res.status}`;
    throw new Error(errorMsg);
  }

  return json;
}

// ── Auth Endpoints ────────────────────────────────────────────────────────
export const apiLogin = async (email: string, kataSandi: string) => {
  const res = await request<any>('/login', {
    method: 'POST',
    body: {
      email,
      password: kataSandi,
      platform: 'mobile',
      device_name: 'react_native_app',
    },
  });
  const token = res?.data?.token ?? res?.token;
  if (token) setAuthToken(token);
  return res;
};

export const apiProfile = async () => {
  return request<any>('/profile');
};

export const apiLogout = async () => {
  try {
    await request<any>('/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
};

// ── Dashboard & SPPD ──────────────────────────────────────────────────────
export const apiDashboard = async () => {
  return request<any>('/dashboard/ringkasan');
};

export const apiDashboardAnggaran = async () => {
  return request<any>('/dashboard/anggaran');
};

export const apiListSppd = async (query = '') => {
  const endpoint = query ? `/sppd?cari=${encodeURIComponent(query)}` : '/sppd';
  return request<any>(endpoint);
};

export const apiDetailSppd = async (id: number | string) => {
  return request<any>(`/sppd/${id}`);
};

export const apiCreateSppd = async (data: {
  keperluan: string;
  agenda?: string;
  tujuan_lainnya: string;
  tanggal_berangkat: string;
  tanggal_kembali: string;
  moda_transportasi: string;
  uang_muka_diminta?: number;
  catatan_pemohon?: string;
  rincian_biaya?: any[];
}) => {
  return request<any>('/sppd', {
    method: 'POST',
    body: data,
  });
};

export const apiMetaOpsi = async () => {
  return request<any>('/sppd/meta/opsi');
};

// ── Approval & Finance ────────────────────────────────────────────────────
export const apiApprovalQueue = async () => {
  return request<any>('/persetujuan/antrean');
};

export const apiApproveTrip = async (id: number, catatan?: string) => {
  return request<any>(`/persetujuan/${id}/setujui`, {
    method: 'POST',
    body: { catatan },
  });
};

export const apiRejectTrip = async (id: number, catatan: string) => {
  return request<any>(`/persetujuan/${id}/tolak`, {
    method: 'POST',
    body: { catatan },
  });
};

export const apiListLaporan = async () => {
  return request<any>('/laporan');
};

export const apiListPencairan = async () => {
  return request<any>('/pencairan');
};

export const apiPayDisbursement = async (id: number, ref?: string) => {
  return request<any>(`/pencairan/${id}/proses`, {
    method: 'POST',
    body: { nomor_referensi: ref },
  });
};

export const apiNotifications = async () => {
  return request<any>('/notifikasi');
};
