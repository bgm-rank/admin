import { getActiveEndpoint } from './env-store';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  requireAuth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, requireAuth = path.startsWith('/admin') } = options;
  const { baseUrl, token } = getActiveEndpoint();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (requireAuth && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!resp.ok) {
    let errMsg = `HTTP ${resp.status}`;
    try {
      const json = (await resp.json()) as { error?: string };
      if (json?.error) errMsg = json.error;
    } catch {
      // ignore non-json error body
    }
    if (resp.status === 401) {
      throw new ApiError(401, `鉴权失败 (401)：请在右上角环境设置中配置有效的 ADMIN_TOKEN`);
    }
    throw new ApiError(resp.status, errMsg);
  }

  return (await resp.json()) as T;
}

export async function downloadAdminNdjson(path: string, filename: string): Promise<void> {
  const { baseUrl, token } = getActiveEndpoint();
  const headers: Record<string, string> = {};
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  const resp = await fetch(`${baseUrl}${path}`, { headers });
  if (!resp.ok) {
    if (resp.status === 401) {
      throw new ApiError(401, '鉴权失败 (401)：请检查 ADMIN_TOKEN');
    }
    throw new ApiError(resp.status, `导出失败 (HTTP ${resp.status})`);
  }
  const text = await resp.text();
  const blob = new Blob([text], { type: 'application/x-ndjson;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function apiStreamSse(
  path: string,
  options: {
    method?: 'POST' | 'GET';
    body?: unknown;
    signal?: AbortSignal;
    onEvent: (payload: Record<string, unknown>) => void;
  },
): Promise<void> {
  const { method = 'POST', body, signal, onEvent } = options;
  const { baseUrl, token } = getActiveEndpoint();

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!resp.ok) {
    let errMsg = `HTTP ${resp.status}`;
    try {
      const json = (await resp.json()) as { error?: string };
      if (json?.error) errMsg = json.error;
    } catch {
      // ignore
    }
    if (resp.status === 401) {
      throw new ApiError(401, '鉴权失败 (401)：请检查当前环境的 ADMIN_TOKEN');
    }
    throw new ApiError(resp.status, errMsg);
  }

  if (!resp.body) return;

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonText = trimmed.slice(5).trim();
      if (!jsonText) continue;
      try {
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;
        onEvent(parsed);
      } catch {
        // skip keepalive or malformed frame
      }
    }
  }
}
