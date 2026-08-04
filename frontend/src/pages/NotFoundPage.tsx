import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';

import { Logo } from '../components/ui/Logo';

export function NotFoundPage() {
  return <main className="not-found"><Logo /><div className="not-found__art"><Compass size={54} /><span>404</span></div><p className="eyebrow">Здесь ничего нет</p><h1>Кажется, эта комната не существует</h1><p>Адрес мог измениться. Вернитесь в рабочее пространство и продолжайте планировать встречи.</p><Link className="button button--primary button--lg" to="/dashboard"><ArrowLeft size={17} /><span>Вернуться в BookIt</span></Link></main>;
}
