import { useAuthStore } from "@/stores/auth-store";
import { API_BASE_URL } from "@/lib/env";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  // Some endpoints (tenant signup, login) run before a tenant/session exists.
  skipAuth?: boolean;
  skipTenant?: boolean;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const { tenantId, refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!tenantId || !refreshToken) return false;

  const res = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    clear();
    return false;
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

/**
 * docs/07-api-design.md §3 response envelope + auth header conventions.
 * Retries once on 401 via refresh-token rotation (docs/04-rbac-security.md §5).
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, skipAuth = false, skipTenant = false } = options;

  const doFetch = async (): Promise<Response> => {
    const { tenantId, accessToken } = useAuthStore.getState();
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {};
    // Skip the JSON content-type (and JSON.stringify below) for FormData bodies —
    // the browser sets its own multipart/form-data content-type with the boundary.
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (!skipTenant && tenantId) headers["X-Tenant-ID"] = tenantId;
    if (!skipAuth && accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    return fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuth) {
    refreshPromise ??= tryRefresh().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const error = json?.error ?? { code: "unknown_error", message: res.statusText };
    throw new ApiError(res.status, error.code, error.message, error.details);
  }

  return json as T;
}
