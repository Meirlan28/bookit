import { ArrowUpRight, CalendarCheck2, CheckCircle2, Sparkles } from 'lucide-react';

import { Logo } from '../components/ui/Logo';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-brand" aria-label="О BookIt">
        <div className="auth-brand__ambient auth-brand__ambient--one" />
        <div className="auth-brand__ambient auth-brand__ambient--two" />
        <Logo />
        <div className="auth-brand__content">
          <span className="auth-brand__pill"><Sparkles size={15} /> Умное пространство для встреч</span>
          <h1>Меньше поисков.<br />Больше <em>идей.</em></h1>
          <p>Выберите переговорную и забронируйте удобное время — без переписок, таблиц и лишних шагов.</p>
          <div className="auth-brand__features">
            <span><CheckCircle2 size={17} /> Все комнаты в одном месте</span>
            <span><CheckCircle2 size={17} /> Бронирование за пару минут</span>
          </div>
        </div>
        <div className="auth-brand__preview">
          <div className="auth-brand__preview-icon"><CalendarCheck2 size={23} /></div>
          <div><small>Следующая встреча</small><strong>Product sync · 14:30</strong></div>
          <span><ArrowUpRight size={18} /></span>
        </div>
        <p className="auth-brand__footer">© 2026 BookIt · Пространство работает на вас</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__mobile-logo"><Logo /></div>
        <div className="auth-panel__content">{children}</div>
        <p className="auth-panel__support">Нужна помощь? <a href="mailto:support@bookit.local">Напишите нам</a></p>
      </section>
    </main>
  );
}
