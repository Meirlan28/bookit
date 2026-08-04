import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FieldShell, Input, Textarea } from './FormField';

describe('form fields', () => {
  it('associates the label with a password input and toggles visibility', async () => {
    const user = userEvent.setup();

    render(
      <FieldShell
        label="Пароль"
        htmlFor="password"
        hint="Минимум 8 символов"
        error="Пароль слишком короткий"
      >
        <Input id="password" type="password" invalid defaultValue="secret123" />
      </FieldShell>,
    );

    const input = screen.getByLabelText('Пароль');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Минимум 8 символов')).toBeVisible();
    expect(screen.getByText('Пароль слишком короткий')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('marks a textarea as invalid only when requested', () => {
    const { rerender } = render(<Textarea aria-label="Описание" />);

    expect(screen.getByLabelText('Описание')).not.toHaveAttribute('aria-invalid');

    rerender(<Textarea aria-label="Описание" invalid />);
    expect(screen.getByLabelText('Описание')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
