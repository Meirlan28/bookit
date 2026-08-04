import { createContext } from 'react';

import type { User } from '../../types/api';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string, deviceCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
