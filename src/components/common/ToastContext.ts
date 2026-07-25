import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'info' | 'error';

export type AddToastOptions = {
  message: string;
  title?: string;
  tone?: ToastTone;
};

export type ToastContextValue = {
  addToast: (options: AddToastOptions) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast precisa ser utilizado dentro de ToastProvider.');
  }

  return context;
}
