import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'wouter';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { FieldShell, Input } from '../../components/ui/FormField';
import { ApiError, apiRequest } from '../../lib/api-client';

const schema = z.object({
  password: z.string().min(8, 'Используйте не менее 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: 'Пароли не совпадают', path: ['confirmPassword'] });
type Values = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    if (!token) return;
    setServerError(null);
    try {
      await apiRequest('/api/v1/auth/reset-password', { method: 'POST', body: { token, new_password: password }, auth: false, retryOnUnauthorized: false });
      setDone(true);
    } catch (error) {
      setServerError(error instanceof ApiError && error.status === 400 ? 'Ссылка недействительна или уже истекла. Запросите новую.' : error instanceof ApiError ? error.message : 'Не удалось изменить пароль.');
    }
  });

  if (!token) {
    return <div className="auth-form-card auth-success"><div className="form-alert form-alert--error">В ссылке нет токена восстановления.</div><h2>Ссылка повреждена</h2><p>Запросите новое письмо для восстановления доступа.</p><Link className="button button--primary button--lg button--full" to="/forgot-password"><span>Запросить новую ссылку</span></Link></div>;
  }

  if (done) {
    return <div className="auth-form-card auth-success"><div className="auth-success__icon"><CheckCircle2 size={32} /></div><p className="eyebrow">Готово</p><h2>Пароль обновлён</h2><p>Все старые сессии завершены. Теперь войдите с новым паролем.</p><Link className="button button--primary button--lg button--full" to="/login"><span>Войти в BookIt</span></Link></div>;
  }

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__heading"><p className="eyebrow">Новый пароль</p><h2>Защитите аккаунт</h2><p>Придумайте пароль, который не используете в других сервисах.</p></div>
      <form onSubmit={(event) => void onSubmit(event)} className="auth-form" noValidate>
        <FieldShell label="Новый пароль" htmlFor="password" error={errors.password?.message} hint="От 8 символов"><Input id="password" type="password" autoComplete="new-password" leadingIcon={<LockKeyhole size={18} />} invalid={Boolean(errors.password)} {...register('password')} /></FieldShell>
        <FieldShell label="Повторите пароль" htmlFor="confirmPassword" error={errors.confirmPassword?.message}><Input id="confirmPassword" type="password" autoComplete="new-password" leadingIcon={<LockKeyhole size={18} />} invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} /></FieldShell>
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>Сохранить новый пароль</Button>
      </form>
    </div>
  );
}
