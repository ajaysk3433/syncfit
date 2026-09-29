import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

const STORAGE_API_URL_KEY = 'syncfit_custom_api_url';

/**
 * Determine default backend API base URL depending on platform.
 * Android Emulator uses 10.0.2.2 to access host machine's localhost.
 * Physical devices on local WiFi connect via 192.168.1.5:8080.
 * iOS Simulator and Web connect to localhost:8080.
 */
export const getDefaultApiUrl = (): string => {
  if (Platform.OS === 'android') {
    // 10.0.2.2 is standard for Android Emulator; fallback to local LAN IP
    return 'http://10.0.2.2:8080';
  }
  return 'http://localhost:8080';
};

let cachedApiUrl: string | null = null;

export const getApiBaseUrl = async (): Promise<string> => {
  if (cachedApiUrl) return cachedApiUrl;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_API_URL_KEY);
    if (saved) {
      cachedApiUrl = saved;
      return saved;
    }
  } catch {
    // ignore storage error
  }
  cachedApiUrl = getDefaultApiUrl();
  return cachedApiUrl;
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  cachedApiUrl = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(STORAGE_API_URL_KEY, cachedApiUrl);
};

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  phone?: string | null;
  role: 'ADMIN' | 'MANAGER' | 'FRONT_DESK' | 'TRAINER' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  memberTier: 'STANDARD' | 'PREMIUM' | 'VIP' | null;
  avatarUrl?: string | null;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  gymId: string;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'AUTO_CHECKED_OUT' | 'DENIED';
  checkInTime: string;
  checkOutTime?: string | null;
  durationMinutes?: number | null;
  method: string;
  location?: string | null;
  notes?: string | null;
  gym?: {
    id: string;
    name: string;
    code: string;
    city?: string;
    address?: string;
  };
}

export interface MembershipPlan {
  id: string;
  name: string;
  tier: string;
  price: number;
  durationDays: number;
  features: string[];
}

export interface ActiveMembership {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: string;
  autoRenew: boolean;
  plan: MembershipPlan;
}

export interface MeResponse {
  user: UserProfile;
  activeAttendance: AttendanceRecord | null;
  activeMembership: ActiveMembership | null;
}

export interface ScanResult {
  action: 'CHECKED_IN' | 'CHECKED_OUT' | 'ALREADY_CHECKED_IN';
  message: string;
  attendanceId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  durationMinutes?: number;
  status?: string;
  gym?: {
    id: string;
    name: string;
    code: string;
    location?: string;
  };
  member?: {
    id: string;
    name: string | null;
    tier?: string | null;
  };
}

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token', err);
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = await getApiBaseUrl();
    const headers = await this.getAuthHeaders();

    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });
    } catch (netErr: any) {
      // In Android emulator or physical device, if 10.0.2.2 fails, try local LAN IP 192.168.1.5
      if (baseUrl === 'http://10.0.2.2:8080') {
        try {
          const fallbackUrl = `http://192.168.1.5:8080${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          response = await fetch(fallbackUrl, {
            ...options,
            headers: {
              ...headers,
              ...(options.headers || {}),
            },
          });
          // Cache successful fallback
          await setApiBaseUrl('http://192.168.1.5:8080');
        } catch {
          throw new Error(
            `Unable to connect to server at ${baseUrl}. Ensure backend is running.`
          );
        }
      } else {
        throw new Error(
          `Unable to connect to server at ${baseUrl}. Please check network connection.`
        );
      }
    }

    const data = await response.json();

    if (!response.ok || data.success === false) {
      const errorMsg =
        data.message ||
        data.error?.message ||
        `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data.data !== undefined ? data.data : data;
  }

  /**
   * Health check for backend connectivity
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const baseUrl = await getApiBaseUrl();
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return await res.json();
  }

  /**
   * Fetch current authenticated user's profile and active check-in
   */
  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>('/v1/auth/me');
  }

  /**
   * Primary QR Code Scan endpoint
   * Performs check-in or check-out based on current status or requested action
   */
  async scanGymQr(
    gymQrCode: string,
    action: 'AUTO' | 'CHECK_IN' | 'CHECK_OUT' = 'AUTO',
    notes?: string
  ): Promise<ScanResult> {
    return this.request<ScanResult>('/v1/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({
        gymQrCode,
        action,
        ...(notes ? { notes } : {}),
      }),
    });
  }

  /**
   * Manual Check-In endpoint
   */
  async checkIn(gymQrCode?: string, notes?: string): Promise<ScanResult> {
    return this.request<ScanResult>('/v1/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({
        gymQrCode,
        method: 'QR_CODE',
        ...(notes ? { notes } : {}),
      }),
    });
  }

  /**
   * Manual Check-Out endpoint
   */
  async checkOut(attendanceId?: string, notes?: string): Promise<ScanResult> {
    return this.request<ScanResult>('/v1/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({
        attendanceId,
        ...(notes ? { notes } : {}),
      }),
    });
  }

  /**
   * Fetch attendance history for the member
   */
  async getMemberAttendance(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ attendanceLogs: AttendanceRecord[]; summary?: any }> {
    return this.request<{ attendanceLogs: AttendanceRecord[]; summary?: any }>(
      `/v1/attendance/members/${userId}?page=${page}&limit=${limit}`
    );
  }

  /**
   * Get active gym QR code (for simulator testing and preview)
   */
  async getActiveGymQr(): Promise<{
    gymId: string;
    name: string;
    code: string;
    qrCodeKey: string;
    qrPayload: string;
    displayLocation: string;
  }> {
    return this.request<any>('/v1/gym/qr');
  }

  /**
   * Get live gym occupancy
   */
  async getOccupancy(): Promise<{
    currentlyActiveCount: number;
    maxCapacity: number;
    occupancyPercentage: number;
    status: string;
  }> {
    return this.request<any>('/v1/attendance/occupancy');
  }
}

export const api = new ApiService();
export default api;
