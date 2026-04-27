import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from '@/app/router';
import { ThemeProvider } from '@/app/theme';
import { CurrencyProvider } from '@/app/currency-provider';
import { AuthProvider } from '@/auth/session';
import { ErrorBoundary } from '@/components/error-boundary';
import '@/styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element missing');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
