const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
if (process.env.NODE_ENV === "production" && !configuredApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL must be configured for production builds.");
}

export const API_URL = (configuredApiUrl || "http://localhost:4000").replace(/\/$/, "");

export type ApiError = {
  error?: { code?: string; message?: string; details?: unknown };
};

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiError;
    throw new Error(payload.error?.message || `Request failed (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function googleSignInUrl() {
  return `${API_URL}/api/v1/auth/google`;
}
