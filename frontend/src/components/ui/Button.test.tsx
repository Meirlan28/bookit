import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('applies its visual options and forwards click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        className="custom-class"
        onClick={onClick}
      >
        Создать бронь
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Создать бронь' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeEnabled();
    expect(button).toHaveClass(
      'button',
      'button--secondary',
      'button--lg',
      'button--full',
      'custom-class',
    );

    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables interaction and displays a spinner while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <Button loading onClick={onClick}>
        Сохранить
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Сохранить' });
    expect(button).toBeDisabled();
    expect(container.querySelector('.button__spinner')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
