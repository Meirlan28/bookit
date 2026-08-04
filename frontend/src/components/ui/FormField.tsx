import { Eye, EyeOff } from 'lucide-react';
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FieldShell({ label, htmlFor, hint, error, children }: FieldShellProps) {
  return (
    <div className={clsx('field', error && 'field--error')}>
      <div className="field__label-row">
        <label htmlFor={htmlFor}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leadingIcon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className={clsx('input-wrap', leadingIcon && 'input-wrap--icon')}>
        {leadingIcon && <span className="input-wrap__leading">{leadingIcon}</span>}
        <input
          ref={ref}
          className={clsx('input', className)}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={invalid || undefined}
          {...props}
        />
        {isPassword && (
          <button
            className="input-wrap__action"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx('input', 'textarea', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
