import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, MailWarning } from 'lucide-react';
import { Link, useSearchParams } from 'wouter';

import { apiRequest } from '../../lib/api-client';
import type { MessageResponse } from '../../types/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const verification = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => apiRequest<MessageResponse>(`/api/v1/auth/verify?token=${encodeURIComponent(token ?? '')}`, { auth: false, retryOnUnauthorized: false }),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token || verification.isError) {
    return <div className="auth-form-card auth-success"><div className="auth-success__icon auth-success__icon--error"><MailWarning size={31} /></div><p className="eyebrow">Ссылка недействительна</p><h2>Не удалось подтвердить email</h2><p>Возможно, ссылка истекла или уже была использована. Если аккаунт уже подтверждён, попробуйте войти.</p><Link className="button button--primary button--lg button--full" to="/login"><span>Перейти ко входу</span></Link></div>;
  }

  if (verification.isPending) {
    return <div className="auth-form-card auth-success"><div className="auth-success__icon"><LoaderCircle className="button__spinner" size={31} /></div><p className="eyebrow">Один момент</p><h2>Подтверждаем email…</h2><p>Безопасно проверяем ссылку. Это займёт пару секунд.</p></div>;
  }

  return <div className="auth-form-card auth-success"><div className="auth-success__icon"><CheckCircle2 size={32} /></div><p className="eyebrow">Email подтверждён</p><h2>Добро пожаловать в BookIt</h2><p>Аккаунт активирован. Теперь можно войти и забронировать первую переговорную.</p><Link className="button button--primary button--lg button--full" to="/login"><span>Войти в пространство</span></Link></div>;
}
