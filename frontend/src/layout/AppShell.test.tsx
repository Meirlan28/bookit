import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AuthContext,
  type AuthContextValue,
} from '../features/auth/auth-context';
import type { UserRole } from '../types/api';
import { AppShell } from './AppShell';

function authValue(role: UserRole): AuthContextValue {
  const user = {
    id: 7,
    email: role === 'admin' ? 'admin@example.com' : 'member@example.com',
    is_active: true,
    is_verified: true,
    role,
  };

  return {
    status: 'authenticated',
    user,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    refreshUser: () => Promise.resolve(user),
  };
}

function renderShell(role: UserRole) {
  return render(
    <AuthContext.Provider value={authValue(role)}>
      <AppShell>
        <h1>Рабочая область</h1>
      </AppShell>
    </AuthContext.Provider>,
  );
}

describe('AppShell role navigation', () => {
  it('shows the admin destination in desktop and mobile navigation for admins', () => {
    renderShell('admin');

    const adminLinks = screen.getAllByRole('link', { name: 'Админка' });
    expect(adminLinks).toHaveLength(2);
    adminLinks.forEach((link) => expect(link).toHaveAttribute('href', '/admin'));
    expect(screen.getByRole('heading', { name: 'Рабочая область' })).toBeVisible();
  });

  it('does not expose the admin destination to regular users', () => {
    renderShell('user');

    expect(screen.queryByRole('link', { name: 'Админка' })).not.toBeInTheDocument();
    expect(screen.getByText('Участник команды')).toBeVisible();
  });
});
