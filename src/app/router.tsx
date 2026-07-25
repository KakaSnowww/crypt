import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AuthLayout } from '../components/layout/AuthLayout';
import { AppHomeRoute } from '../routes/AppHomeRoute';
import { DesignSystemRoute } from '../routes/DesignSystemRoute';
import { LoginRoute } from '../routes/LoginRoute';
import { NotFoundRoute } from '../routes/NotFoundRoute';
import { RouteErrorFallback } from '../routes/RouteErrorFallback';

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
        element: <LoginRoute />,
      },
    ],
  },
  {
    path: '/app',
    element: <AppShell />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: <AppHomeRoute />,
      },
      {
        path: 'componentes',
        element: <DesignSystemRoute />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundRoute />,
  },
];

export const router = createBrowserRouter(appRoutes);
