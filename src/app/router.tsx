import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './root';
import Dashboard from '@/routes/dashboard';
import TransactionsList from '@/routes/transactions/list';
import MoveMoney from '@/routes/budget/move-money';
import AccountsList from '@/routes/accounts/list';
import Reports from '@/routes/reports/index';
import Settings from '@/routes/settings';
import Onboarding from '@/routes/onboarding';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <TransactionsList /> },
      { path: 'budget', element: <MoveMoney /> },
      { path: 'accounts', element: <AccountsList /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
      { path: 'onboarding', element: <Onboarding /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
