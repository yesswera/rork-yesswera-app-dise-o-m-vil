// YESSWERA VPS API CONFIGURATION
// Backend propio en VPS compartido con Tonalli
// El VPS complementa a Supabase (no lo reemplaza)

export const API_BASE_URL = 'http://217.216.94.95/yw';

// Helper para hacer requests al VPS API
export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    token?: string | null;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, token, timeout = 15000 } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Check API health (non-blocking, fails silently)
export async function checkApiHealth(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const data = await apiRequest('/health', { timeout: 5000 });
    return { ok: data.status === 'ok', latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

// Sync user session with VPS (after Supabase auth)
export async function syncUserSession(user: {
  id: string;
  email: string;
  name: string;
  userType: string;
}): Promise<void> {
  try {
    await apiRequest('/api/v1/users/sync', {
      method: 'POST',
      body: {
        supabase_id: user.id,
        email: user.email,
        full_name: user.name,
        user_type: user.userType,
      },
      timeout: 5000,
    });
  } catch {
    // Non-blocking: VPS sync failure doesn't break the app
  }
}

// Register push token with VPS
export async function registerPushToken(
  userId: string,
  pushToken: string,
  platform: 'android' | 'ios'
): Promise<void> {
  try {
    await apiRequest('/api/v1/users/push-token', {
      method: 'POST',
      body: { user_id: userId, push_token: pushToken, platform },
      timeout: 5000,
    });
  } catch {
    // Non-blocking
  }
}

// Report analytics event to VPS
export async function reportEvent(
  userId: string,
  event: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await apiRequest('/api/v1/analytics/event', {
      method: 'POST',
      body: { user_id: userId, event, data, timestamp: new Date().toISOString() },
      timeout: 3000,
    });
  } catch {
    // Non-blocking
  }
}
