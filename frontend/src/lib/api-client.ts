import type { TokenResponse } from '../types/api';

type ValidationIssue = {
  loc?: Array<string | number>;
  msg?: string;
};

type ErrorPayload = {
  detail?: string | ValidationIssue[];
  code?: string;
  seconds_left?: number;
};

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(
  /\/$/,
  '',
) ?? '';

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly secondsLeft?: number;
  readonly issues?: ValidationIssue[];

  constructor(
    message: string,
    status: number,
    payload: ErrorPayload | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code;
    this.secondsLeft = payload?.seconds_left;
    this.issues = Array.isArray(payload?.detail) ? payload.detail : undefined;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function errorMessage(payload: ErrorPayload | null, fallback: string): string {
  if (typeof payload?.detail === 'string') {
    return payload.detail;
  }

  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((issue) => issue.msg).filter(Boolean).join('. ');
  }

  return fallback;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ErrorPayload | null = null;

  try {
    payload = (await response.json()) as ErrorPayload;
  } catch {
    // Some infrastructure errors return HTML or an empty body.
  }

  return new ApiError(
    errorMessage(payload, 'Не удалось выполнить запрос. Попробуйте ещё раз.'),
    response.status,
    payload,
  );
}

function makeHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function execute<T>(path: string, options: RequestOptions): Promise<T> {
  const body =
    options.body === undefined || options.body instanceof FormData
      ? options.body
      : JSON.stringify(options.body);

  const response = await fetch(apiUrl(path), {
    ...options,
    body,
    headers: makeHeaders(options),
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function restoreAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = execute<TokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      auth: false,
      retryOnUnauthorized: false,
    })
      .then((response) => {
        setAccessToken(response.access_token);
        return true;
      })
      .catch(() => {
        setAccessToken(null);
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await execute<T>(path, options);
  } catch (error) {
    const shouldRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      options.auth !== false &&
      options.retryOnUnauthorized !== false;

    if (!shouldRefresh) {
      throw error;
    }

    const restored = await restoreAccessToken();
    if (!restored) {
      unauthorizedHandler?.();
      throw error;
    }

    return execute<T>(path, { ...options, retryOnUnauthorized: false });
  }
}

export async function loginRequest(
  email: string,
  password: string,
  deviceCode?: string,
): Promise<TokenResponse> {
  const form = new URLSearchParams({ username: email, password });
  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  if (deviceCode) {
    headers.set('X-Device-Code', deviceCode);
  }

  const response = await fetch(apiUrl('/api/v1/auth/login'), {
    method: 'POST',
    body: form,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as TokenResponse;
}
