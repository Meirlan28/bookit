import { LoaderCircle } from 'lucide-react';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'button',
        `button--${variant}`,
        `button--${size}`,
        fullWidth && 'button--full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="button__spinner" aria-hidden /> : icon}
      <span>{children}</span>
    </button>
  ),
);

Button.displayName = 'Button';
