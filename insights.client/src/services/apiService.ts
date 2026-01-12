const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: string;
}

type ApiResult<T> = ApiSuccess<T> | ApiError;

export async function callApi<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    };

    if (body !== undefined && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
  
      try {
        const parsed = text ? JSON.parse(text) : {};
        return {
          success: false,
          error:
            parsed.message ||
            parsed.error ||
            (text || `Error: ${response.status}`),
        };
      } catch {
        return { success: false, error: text || `Error: ${response.status}` };
      }
    }

    if (response.status === 204) {
      return { success: true, data: undefined as T };
    }

    const text = await response.text();
    if (!text) {
      return { success: true, data: undefined as T };
    }

    return { success: true, data: JSON.parse(text) as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}