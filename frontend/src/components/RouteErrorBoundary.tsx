import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from './ui/Button';
import { Logo } from './ui/Logo';

interface State {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error">
          <Logo />
          <div className="fatal-error__card">
            <p className="eyebrow">Непредвиденная ошибка</p>
            <h1>Давайте начнём с чистого листа</h1>
            <p>Интерфейс столкнулся с ошибкой. Перезагрузите страницу — ваши данные останутся в безопасности.</p>
            <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
