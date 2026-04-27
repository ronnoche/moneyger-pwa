import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './root';
import SignInPage from '@/routes/sign-in';
import AuthCallbackPage from '@/routes/auth-callback';
import Dashboard from '@/routes/dashboard';
import TransactionsList from '@/routes/transactions/list';
import TransactionNew from '@/routes/transactions/new';
import TransactionEdit from '@/routes/transactions/edit';
import More from '@/routes/more';
import Settings from '@/routes/settings/index';
import SettingsAppearance from '@/routes/settings/appearance';
import SettingsData from '@/routes/settings/data';

export const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <TransactionsList /> },
      { path: 'transactions/new', element: <TransactionNew /> },
      { path: 'transactions/:id/edit', element: <TransactionEdit /> },
      {
        path: 'budget',
        lazy: async () => {
          const mod = await import('@/routes/budget/move-money');
          return { Component: mod.default };
        },
      },
      {
        path: 'accounts',
        lazy: async () => {
          const mod = await import('@/routes/accounts/list');
          return { Component: mod.default };
        },
      },
      {
        path: 'accounts/:id',
        lazy: async () => {
          const mod = await import('@/routes/accounts/register');
          return { Component: mod.default };
        },
      },
      {
        path: 'reports',
        lazy: async () => {
          const mod = await import('@/routes/reports/index');
          return { Component: mod.default };
        },
      },
      { path: 'more', element: <More /> },
      { path: 'settings', element: <Settings /> },
      {
        path: 'settings/groups',
        lazy: async () => {
          const mod = await import('@/routes/settings/groups');
          return { Component: mod.default };
        },
      },
      {
        path: 'settings/categories',
        lazy: async () => {
          const mod = await import('@/routes/settings/categories');
          return { Component: mod.default };
        },
      },
      {
        path: 'settings/accounts',
        lazy: async () => {
          const mod = await import('@/routes/settings/accounts');
          return { Component: mod.default };
        },
      },
      { path: 'settings/appearance', element: <SettingsAppearance /> },
      { path: 'settings/data', element: <SettingsData /> },
      {
        path: 'onboarding',
        lazy: async () => {
          const mod = await import('@/routes/onboarding');
          return { Component: mod.default };
        },
      },
      {
        path: 'dev/tokens',
        lazy: async () => {
          const mod = await import('@/routes/dev/tokens');
          return { Component: mod.default };
        },
      },
      {
        path: 'dev/components',
        lazy: async () => {
          const mod = await import('@/routes/dev/components');
          return { Component: mod.default };
        },
      },
      {
        path: 'dev/auto-assign',
        lazy: async () => {
          const mod = await import('@/routes/dev/auto-assign');
          return { Component: mod.default };
        },
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
