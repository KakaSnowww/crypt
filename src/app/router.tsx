import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { RouteErrorFallback } from '../routes/RouteErrorFallback';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '../features/auth/PublicOnlyRoute';
import {
  AccountSecurityRoute,
  AppHomeRoute,
  AppShell,
  AuthCallbackRoute,
  DesignSystemRoute,
  ForgotPasswordRoute,
  LazyRoute,
  LoginRoute,
  NotFoundRoute,
  RegisterRoute,
  ResetPasswordRoute,
} from './lazyRoutes';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate replace to="/app" />,
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: '/login',
        element: (
          <PublicOnlyRoute>
            <LazyRoute>
              <LoginRoute />
            </LazyRoute>
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/cadastro',
        element: (
          <PublicOnlyRoute>
            <LazyRoute>
              <RegisterRoute />
            </LazyRoute>
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/recuperar-senha',
        element: (
          <PublicOnlyRoute>
            <LazyRoute>
              <ForgotPasswordRoute />
            </LazyRoute>
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/redefinir-senha',
        element: (
          <LazyRoute>
            <ResetPasswordRoute />
          </LazyRoute>
        ),
      },
      {
        path: '/auth/callback',
        element: (
          <LazyRoute>
            <AuthCallbackRoute />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <AppShell />
        </LazyRoute>
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: (
          <LazyRoute>
            <AppHomeRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'componentes',
        element: (
          <LazyRoute>
            <DesignSystemRoute />
          </LazyRoute>
        ),
      },
      {
        path: 'conta',
        element: (
          <LazyRoute>
            <AccountSecurityRoute />
          </LazyRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <LazyRoute>
        <NotFoundRoute />
      </LazyRoute>
    ),
  },
];

export const router = createBrowserRouter(appRoutes);
