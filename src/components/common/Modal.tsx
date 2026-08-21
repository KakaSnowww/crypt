import * as Dialog from '@radix-ui/react-dialog';
import { Cpu, X } from 'lucide-react';
import type { ReactNode } from 'react';

export type ModalProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function Modal({ children, description, footer, onOpenChange, open, title }: ModalProps) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-50 bg-[#020208]/80 backdrop-blur-md" />
        <Dialog.Content className="crypt-modal modal-content fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.75rem] border p-6 focus:outline-none sm:p-7">
          <span aria-hidden="true" className="crypt-modal__sigil" />

          <div className="relative pr-10">
            <p className="mb-2 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-violet-300">
              <Cpu size={11} />
              Crypt OS
            </p>
            <Dialog.Title className="text-xl font-bold tracking-tight text-white">
              {title}
            </Dialog.Title>

            {description ? (
              <Dialog.Description className="mt-2 text-sm leading-6 text-crypt-muted">
                {description}
              </Dialog.Description>
            ) : null}
          </div>

          <Dialog.Close asChild>
            <button
              aria-label="Fechar janela"
              className="crypt-icon-button absolute right-5 top-5 grid size-10 place-items-center rounded-xl text-crypt-muted"
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </Dialog.Close>

          <div className="relative mt-6">{children}</div>

          {footer ? (
            <div className="relative mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
