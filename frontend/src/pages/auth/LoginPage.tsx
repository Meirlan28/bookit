import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useSearchParams } from 'wouter';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { FieldShell, Input } from '../../components/ui/FormField';
import { useAuth } from '../../features/auth/use-auth';
import { ApiError } from '../../lib/api-client';

const loginSchema = z.object({
  email: z.string().trim().email('Введите корректный email'),
  password: z.string().min(3, 'Введите пароль'),
  deviceCode: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

function loginErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'invalid_credentials': return 'Неверный email или пароль. Проверьте данные и попробуйте снова.';
    case 'user_not_verified': return 'Сначала подтвердите email по ссылке из письма.';
    case 'user_inactive': return 'Аккаунт приостановлен. Обратитесь к администратору.';
    case 'invalid_two_factor_code': return 'Код неверный или уже истёк. Проверьте письмо и попробуйте снова.';
    case 'login_cooldown': return `Слишком много попыток. Подождите ${error.secondsLeft ?? 'несколько'} сек.`;
    default: return error.message;
  }
}

export function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [searchParams] = useSearchParams();
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', deviceCode: '' },
  });

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const onSubmit = handleSubmit(async ({ email, password, deviceCode }) => {
    setServerError(null);
    try {
      await login(email, password, otpStep ? deviceCode : undefined);
      const requested = searchParams.get('next');
      const target = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
      void navigate(target, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'new_device_verification_required') {
          setOtpEmail(email);
          setOtpStep(true);
          setValue('deviceCode', '');
          window.setTimeout(() => setFocus('deviceCode'), 0);
          return;
        }
        if (error.code === 'login_cooldown') setCooldown(error.secondsLeft ?? 5);
        setServerError(loginErrorMessage(error));
      } else {
        setServerError('Не удалось связаться с сервером. Проверьте соединение.');
      }
    }
  });

  if (otpStep) {
    return (
      <div className="auth-form-card">
        <button className="back-link" type="button" onClick={() => { setOtpStep(false); setServerError(null); }}>
          <ArrowLeft size={17} /> Назад ко входу
        </button>
        <div className="auth-form-card__icon"><KeyRound size={24} /></div>
        <div className="auth-form-card__heading">
          <p className="eyebrow">Защита аккаунта</p>
          <h2>Подтвердите устройство</h2>
          <p>Мы отправили шестизначный код на <strong>{otpEmail}</strong></p>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="auth-form" noValidate>
          <FieldShell label="Код из письма" htmlFor="deviceCode" error={errors.deviceCode?.message}>
            <Input
              id="deviceCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="input--otp"
              placeholder="000000"
              invalid={Boolean(errors.deviceCode)}
              {...register('deviceCode', {
                required: 'Введите код из письма',
                pattern: { value: /^\d{6}$/, message: 'Код состоит из 6 цифр' },
              })}
            />
          </FieldShell>
          {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>Подтвердить и войти</Button>
        </form>
        <p className="auth-form-card__note">Код действует 10 минут. Если письма нет, проверьте папку «Спам».</p>
      </div>
    );
  }

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__heading">
        <p className="eyebrow">Рады видеть снова</p>
        <h2>Войдите в BookIt</h2>
        <p>Ваши комнаты и встречи уже ждут.</p>
      </div>
      <form onSubmit={(event) => void onSubmit(event)} className="auth-form" noValidate>
        <FieldShell label="Рабочий email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="name@company.com" leadingIcon={<Mail size={18} />} invalid={Boolean(errors.email)} {...register('email')} />
        </FieldShell>
        <FieldShell label="Пароль" htmlFor="password" error={errors.password?.message} hint="Минимум 3 символа">
          <Input id="password" type="password" autoComplete="current-password" placeholder="Введите пароль" leadingIcon={<LockKeyhole size={18} />} invalid={Boolean(errors.password)} {...register('password')} />
        </FieldShell>
        <div className="auth-form__meta"><span /><Link to="/forgot-password">Забыли пароль?</Link></div>
        {serverError && <div className="form-alert form-alert--error" role="alert">{serverError}</div>}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={cooldown > 0}>
          {cooldown ? `Повторить через ${cooldown} сек.` : 'Войти в пространство'}
        </Button>
      </form>
      <p className="auth-form-card__switch">Впервые в BookIt? <Link to="/register">Создать аккаунт</Link></p>
    </div>
  );
}
