import { zodResolver } from '@hookform/resolvers/zod';
import { Check, LockKeyhole, Mail, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { FieldShell, Input } from '../../components/ui/FormField';
import { ApiError, apiRequest } from '../../lib/api-client';

const registerSchema = z.object({
  email: z.string().trim().email('Введите корректный email'),
  password: z.string().min(8, 'Используйте не менее 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: { email, password },
        auth: false,
        retryOnUnauthorized: false,
      });
      setRegisteredEmail(email);
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.code === 'user_already_exists'
          ? 'Аккаунт с таким email уже существует. Попробуйте войти.'
          : error instanceof ApiError ? error.message : 'Не удалось создать аккаунт.',
      );
    }
  });

  if (registeredEmail) {
    return (
      <div className="auth-form-card auth-success">
        <div className="auth-success__icon"><MailCheck size={32} /></div>
        <p className="eyebrow">Почти готово</p>
        <h2>Проверьте почту</h2>
        <p>Мы отправили ссылку для подтверждения на <strong>{registeredEmail}</strong>. После подтверждения можно войти.</p>
        <div className="auth-success__steps">
          <span><Check size={16} /> Аккаунт создан</span>
          <span><Mail size={16} /> Подтвердите email</span>
        </div>
        <Link className="button button--primary button--lg button--full" to="/login"><span>Перейти ко входу</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__heading">
        <p className="eyebrow">Начните за минуту</p>
        <h2>Создайте аккаунт</h2>
        <p>И бронируйте пространство без лишних сообщений.</p>
      </div>
      <form onSubmit={(event) => void onSubmit(event)} className="auth-form" noValidate>
        <FieldShell label="Рабочий email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="name@company.com" leadingIcon={<Mail size={18} />} invalid={Boolean(errors.email)} {...register('email')} />
        </FieldShell>
        <FieldShell label="Пароль" htmlFor="password" error={errors.password?.message} hint="От 8 символов">
          <Input id="password" type="password" autoComplete="new-password" placeholder="Придумайте пароль" leadingIcon={<LockKeyhole size={18} />} invalid={Boolean(errors.password)} {...register('password')} />
        </FieldShell>
        <FieldShell label="Повторите пароль" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Ещё раз для проверки" leadingIcon={<LockKeyhole size={18} />} invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
        </FieldShell>
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>Создать аккаунт</Button>
      </form>
      <p className="auth-form-card__legal">Продолжая, вы соглашаетесь с правилами использования сервиса.</p>
      <p className="auth-form-card__switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </div>
  );
}
