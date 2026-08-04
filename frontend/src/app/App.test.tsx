import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import { AuthContext } from '../features/auth/auth-context';
import { setAccessToken } from '../lib/api-client';
import { App } from './App';

describe('admin route guard', () => {
  afterEach(() => {
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('redirects an authenticated non-admin from /admin to the dashboard', async () => {
    const location = memoryLocation({ path: '/admin', record: true });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const user = {
      id: 11,
      email: 'member@example.com',
      is_active: true,
      is_verified: true,
      role: 'user' as const,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            status: 'authenticated',
            user,
            login: () => Promise.resolve(),
            logout: () => Promise.resolve(),
            refreshUser: () => Promise.resolve(user),
          }}
        >
          <Router hook={location.hook} searchHook={location.searchHook}>
            <App />
          </Router>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(location.history.at(-1)).toBe('/dashboard');
    });
    expect(
      screen.getByRole('heading', { name: /Привет, member/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Админ-панель' }),
    ).not.toBeInTheDocument();

    queryClient.clear();
  });
});
