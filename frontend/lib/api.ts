const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const errorData = await res.json();
      detail = errorData.detail ?? detail;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}