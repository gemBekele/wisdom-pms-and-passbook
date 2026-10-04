import { config } from './config';
import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  token?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
const REQUEST_TIMEOUT_MS = 15000;

export const getAuthToken = () => authToken;

// AuthContext registers a handler so a 401 (expired/revoked token) drops the
// user back to the sign-in screen instead of repeatedly failing.
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const setAuthToken = async (token: string | null) => {
  authToken = token;
  if (token) await setItem(STORAGE_KEYS.authToken, token);
  else await removeItem(STORAGE_KEYS.authToken);
};

export const loadAuthToken = async () => {
  authToken = await getItem(STORAGE_KEYS.authToken);
  return authToken;
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Screens can mount before AuthContext has restored the token; make sure it
    // is loaded so authenticated requests don't race on cold start.
    if (!authToken) await loadAuthToken();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const hadToken = !!authToken;
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T> & { message?: string };

    // An authenticated request rejected with 401 means the session is no longer
    // valid (expired, revoked after a PIN change, etc.). Clear it and sign out.
    if (response.status === 401 && hadToken) {
      await setAuthToken(null);
      unauthorizedHandler?.();
    }

    if (!response.ok || json.success === false) {
      throw new ApiError(json.message || 'Request failed', response.status, json.message);
    }

    return json;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new ApiError('Request timed out. Check your connection.', 408);
    }
    throw new ApiError('Network error. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}
