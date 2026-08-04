import '@fontsource-variable/manrope';
import './styles/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { AuthProvider } from './features/auth/AuthProvider';
import { queryClient } from './lib/query-client';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found');
}

createRoot(root).render(
  <StrictMode>
    <RouteErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </RouteErrorBoundary>
  </StrictMode>,
);
