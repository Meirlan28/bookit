import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import { AuthProvider } from '../../features/auth/AuthProvider';
import { setAccessToken, setUnauthorizedHandler } from '../../lib/api-client';
import { queryClient } from '../../lib/query-client';
import { VerifyEmailPage } from './VerifyEmailPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('VerifyEmailPage', () => {
  afterEach(() => {
    queryClient.clear();
    setAccessToken(null);
    setUnauthorizedHandler(null);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('finishes verification while the initial guest session check is failing', async () => {
    const location = memoryLocation({
      path: '/verify-email',
      searchPath: 'token=verification-token',
    });
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url === '/api/v1/auth/refresh') {
        return new Promise((resolve) => {
          window.setTimeout(
            () => resolve(jsonResponse({ detail: 'No refresh session' }, 401)),
            20,
          );
        });
      }
      if (url.startsWith('/api/v1/auth/verify?')) {
        return new Promise((resolve) => {
          window.setTimeout(
            () => resolve(jsonResponse({ message: 'Email verified' })),
            60,
          );
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router hook={location.hook} searchHook={location.searchHook}>
            <VerifyEmailPage />
          </Router>
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Подтверждаем email…' }),
    ).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'Добро пожаловать в BookIt' }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
