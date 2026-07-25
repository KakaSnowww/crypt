import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { classNames } from '../../lib/classNames';
import { ToastContext, type AddToastOptions, type ToastTone } from './ToastContext';

type Toast = {
  id: number;
  message: string;
  title: string;
  tone: ToastTone;
};

let nextToastId = 1;

const toneDetails = {
  success: {
    defaultTitle: 'Tudo certo',
    icon: CheckCircle2,
    iconClassName: 'text-emerald-300',
  },
  info: {
    defaultTitle: 'Informação',
    icon: Info,
    iconClassName: 'text-blue-300',
  },
  error: {
    defaultTitle: 'Não foi possível concluir',
    icon: CircleAlert,
    iconClassName: 'text-red-300',
  },
} as const;

type ToastItemProps = {
  onDismiss: (id: number) => void;
  toast: Toast;
};

function ToastItem({ onDismiss, toast }: ToastItemProps) {
  const details = toneDetails[toast.tone];
  const Icon = details.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 4500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  return (
    <article
      className="toast-item pointer-events-auto flex w-full gap-3 rounded-2xl border border-white/10 bg-crypt-panel/95 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl"
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <Icon
        aria-hidden="true"
        className={classNames('mt-0.5 shrink-0', details.iconClassName)}
        size={19}
      />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-white">{toast.title}</h2>
        <p className="mt-1 text-xs leading-5 text-crypt-muted">{toast.message}</p>
      </div>
      <button
        aria-label="Dispensar notificação"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-crypt-subtle transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-crypt-focus"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        <X aria-hidden="true" size={15} />
      </button>
    </article>
  );
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((options: AddToastOptions) => {
    const tone = options.tone ?? 'info';
    const toast: Toast = {
      id: nextToastId++,
      message: options.message,
      title: options.title ?? toneDetails[tone].defaultTitle,
      tone,
    };

    setToasts((current) => [...current.slice(-2), toast]);
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <aside
        aria-label="Notificações do aplicativo"
        className="pointer-events-none fixed inset-x-4 top-4 z-[70] ml-auto grid max-w-sm gap-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-full"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} onDismiss={removeToast} toast={toast} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}
