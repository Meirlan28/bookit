import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setAccessToken } from '../../lib/api-client';
import {
  useAdminBookings,
  useAdminStats,
  useAdminUsers,
  useUpdateAdminUser,
} from './admin-api';

const queryClients: QueryClient[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function relativeRequestUrl(input: unknown): URL {
  if (typeof input !== 'string') {
    throw new TypeError('Expected fetch to receive a relative string URL');
  }
  return new URL(input, 'https://bookit.test');
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  queryClients.push(queryClient);

  return function TestQueryClientProvider({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('admin API hooks', () => {
  afterEach(() => {
    queryClients.splice(0).forEach((queryClient) => queryClient.clear());
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('maps user list pagination and a trimmed search to query parameters', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ items: [], total: 0, page: 3, page_size: 50 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => useAdminUsers({ search: '  anna+team@example.com  ', page: 3, pageSize: 50 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledOnce();
    const requestUrl = relativeRequestUrl(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl.pathname).toBe('/api/v1/admin/users');
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      page: '3',
      page_size: '50',
      search: 'anna+team@example.com',
    });
  });

  it('maps the booking status and omits a blank search parameter', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ items: [], total: 0, page: 1, page_size: 20 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () => useAdminBookings({ search: '   ', status: 'past', page: 1, pageSize: 20 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const requestUrl = relativeRequestUrl(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl.pathname).toBe('/api/v1/admin/bookings');
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      page: '1',
      page_size: '20',
      status: 'past',
    });
    expect(requestUrl.searchParams.has('search')).toBe(false);
  });

  it('normalizes the backend today_bookings alias in admin statistics', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({
          total_users: 12,
          active_users: 10,
          verified_users: 9,
          total_rooms: 4,
          total_bookings: 30,
          upcoming_bookings: 7,
          today_bookings: 3,
        }),
      ),
    );

    const { result } = renderHook(() => useAdminStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      total_users: 12,
      bookings_today: 3,
    });
  });

  it('maps an admin user update to the expected PATCH URL and JSON body', async () => {
    const updatedUser = {
      id: 42,
      email: 'team@example.com',
      role: 'admin' as const,
      is_active: false,
      is_verified: true,
      booking_count: 8,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(updatedUser));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('admin-access-token');

    const { result } = renderHook(() => useUpdateAdminUser(), {
      wrapper: createWrapper(),
    });

    let mutationResponse: unknown;
    await act(async () => {
      mutationResponse = await result.current.mutateAsync({
        userId: 42,
        input: { role: 'admin', is_active: false },
      });
    });

    expect(mutationResponse).toEqual(updatedUser);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, options] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(options?.headers);
    expect(requestUrl).toBe('/api/v1/admin/users/42');
    expect(options?.method).toBe('PATCH');
    expect(options?.body).toBe(JSON.stringify({ role: 'admin', is_active: false }));
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer admin-access-token');
  });
});
