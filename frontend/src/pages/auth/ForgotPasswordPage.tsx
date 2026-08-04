import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { FieldShell, Input } from '../../components/ui/FormField';
import { ApiError, apiRequest } from '../../lib/api-client';

const schema = z.object({ email: z.string().trim().email('Введите корректный email') });
type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null);
    try {
      await apiRequest('/api/v1/auth/forgot-password', { method: 'POST', body: { email }, auth: false, retryOnUnauthorized: false });
      setSentTo(email);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Сервис временно недоступен. Попробуйте позже.');
    }
  });

  if (sentTo) {
    return (
      <div className="auth-form-card auth-success">
        <div className="auth-success__icon"><Send size={30} /></div>
        <p className="eyebrow">Письмо отправлено</p>
        <h2>Проверьте входящие</h2>
        <p>Если аккаунт <strong>{sentTo}</strong> существует, в письме будет ссылка для сброса пароля.</p>
        <Link className="button button--secondary button--lg button--full" to="/login"><ArrowLeft size={17} /><span>Вернуться ко входу</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-form-card">
      <Link className="back-link" to="/login"><ArrowLeft size={17} /> Назад ко входу</Link>
      <div className="auth-form-card__heading">
        <p className="eyebrow">Восстановление доступа</p>
        <h2>Забыли пароль?</h2>
        <p>Введите email — отправим безопасную ссылку для создания нового пароля.</p>
      </div>
      <form onSubmit={(event) => void onSubmit(event)} className="auth-form" noValidate>
        <FieldShell label="Email аккаунта" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="name@company.com" leadingIcon={<Mail size={18} />} invalid={Boolean(errors.email)} {...register('email')} />
        </FieldShell>
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>Отправить ссылку</Button>
      </form>
    </div>
  );
}
