import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  apiRequest,
  setAccessToken,
  setUnauthorizedHandler,
} from './api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest', () => {
  afterEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it('serializes JSON and adds the access token to authenticated requests', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 7 }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('access-token');

    await expect(
      apiRequest<{ id: number }>('/api/v1/example', {
        method: 'POST',
        body: { name: 'Переговорная' },
      }),
    ).resolves.toEqual({ id: 7 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(options?.headers);

    expect(url).toBe('/api/v1/example');
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ name: 'Переговорная' }));
    expect(options?.credentials).toBe('include');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('exposes validation details from an API error', async () => {
    const issues = [
      { loc: ['body', 'start_time'], msg: 'Укажите дату начала' },
      { loc: ['body', 'end_time'], msg: 'Некорректное время' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          { detail: issues, code: 'validation_error', seconds_left: 30 },
          422,
        ),
      ),
    );

    const error = await apiRequest('/api/v1/example', { auth: false }).catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'Укажите дату начала. Некорректное время',
      status: 422,
      code: 'validation_error',
      secondsLeft: 30,
      issues,
    });
  });

  it('falls back to a user-friendly message for non-JSON errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('<h1>Bad gateway</h1>', { status: 502 })),
    );

    await expect(
      apiRequest('/api/v1/example', { auth: false }),
    ).rejects.toMatchObject({
      message: 'Не удалось выполнить запрос. Попробуйте ещё раз.',
      status: 502,
    });
  });

  it('refreshes an expired token and retries the original request once', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ detail: 'Token expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('expired-token');

    await expect(
      apiRequest<{ ok: boolean }>('/api/v1/protected'),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/protected',
      '/api/v1/auth/refresh',
      '/api/v1/protected',
    ]);

    const firstHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    const refreshHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(firstHeaders.get('Authorization')).toBe('Bearer expired-token');
    expect(refreshHeaders.has('Authorization')).toBe(false);
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('notifies the app when refreshing an expired session fails', async () => {
    const onUnauthorized = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ detail: 'Token expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Refresh expired' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('expired-token');
    setUnauthorizedHandler(onUnauthorized);

    await expect(apiRequest('/api/v1/protected')).rejects.toMatchObject({
      message: 'Token expired',
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
