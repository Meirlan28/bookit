import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  apiRequest,
  loginRequest,
  restoreAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../../lib/api-client';
import { queryClient } from '../../lib/query-client';
import type { User } from '../../types/api';
import { AuthContext, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const becomeGuest = useCallback((clearPrivateCache = true) => {
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
    if (clearPrivateCache) queryClient.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await apiRequest<User>('/api/v1/auth/me', {
      retryOnUnauthorized: false,
    });
    setUser(currentUser);
    setStatus('authenticated');
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;
    const handleUnauthorized = () => becomeGuest();
    setUnauthorizedHandler(handleUnauthorized);

    const bootstrap = async () => {
      const restored = await restoreAccessToken();
      if (!active) return;

      if (!restored) {
        // Public pages can have their own in-flight requests (for example,
        // email verification). There is no private cache to clear during the
        // initial guest bootstrap, and clearing it would cancel those requests.
        becomeGuest(false);
        return;
      }

      try {
        const currentUser = await apiRequest<User>('/api/v1/auth/me', {
          retryOnUnauthorized: false,
        });
        if (active) {
          setUser(currentUser);
          setStatus('authenticated');
        }
      } catch {
        if (active) becomeGuest(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, [becomeGuest]);

  const login = useCallback(
    async (email: string, password: string, deviceCode?: string) => {
      const token = await loginRequest(email, password, deviceCode);
      setAccessToken(token.access_token);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        retryOnUnauthorized: false,
      });
    } finally {
      becomeGuest();
    }
  }, [becomeGuest]);

  const value = useMemo(
    () => ({ status, user, login, logout, refreshUser }),
    [status, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
