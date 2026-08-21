import { useMutation } from '@tanstack/react-query';
import { Clipboard, QrCode, RefreshCw, ShieldCheck, Smartphone, X, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/ToastContext';
import {
  cancelArcanaPixAutomatic,
  getArcanaPixAutomatic,
  startArcanaPixAutomatic,
  syncArcanaPixAutomatic,
  type ArcanaPixDetails,
  type ArcanaPixPayer,
} from './arcanaPixAutomatic.service';

type SharedProps = {
  onChanged: () => Promise<void>;
};

type ManagerProps = SharedProps & {
  active: boolean;
  pending: boolean;
  provider: null | string | undefined;
};

const emptyPayer: ArcanaPixPayer = {
  addressNumber: '',
  cpfCnpj: '',
  mobilePhone: '',
  name: '',
  postalCode: '',
};

function formatExpiration(value: null | string) {
  if (!value) return null;

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function PixCode({ details, onCopied }: { details: ArcanaPixDetails; onCopied: () => void }) {
  if (!details.payload) return null;

  return (
    <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
      <div className="flex items-start gap-3">
        <QrCode className="mt-0.5 shrink-0 text-cyan-200" size={22} />
        <div>
          <strong className="text-sm text-white">Autorize pelo Pix Copia e Cola</strong>
          <p className="mt-1 text-xs leading-5 text-crypt-muted">
            No aplicativo do seu banco, abra Pix, escolha Copia e Cola e confirme o primeiro
            pagamento junto da autorização mensal.
          </p>
        </div>
      </div>

      <textarea
        aria-label="Código Pix Automático Copia e Cola"
        className="input mt-4 min-h-28 w-full resize-none font-mono text-xs"
        readOnly
        value={details.payload}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          leadingIcon={<Clipboard size={15} />}
          onClick={() => {
            void copyText(details.payload!).then(onCopied);
          }}
          size="sm"
        >
          Copiar código Pix
        </Button>

        {details.expiresAt ? (
          <span className="text-xs text-crypt-subtle">
            Válido até {formatExpiration(details.expiresAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ArcanaPixAutomaticStartButton({ onChanged }: SharedProps) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [payer, setPayer] = useState<ArcanaPixPayer>(emptyPayer);
  const [details, setDetails] = useState<ArcanaPixDetails | null>(null);

  const start = useMutation({
    mutationFn: startArcanaPixAutomatic,
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível criar o Pix Automático',
        tone: 'error',
      });
    },
    onSuccess: async ({ alreadyActive, details: nextDetails }) => {
      setDetails(nextDetails);
      await onChanged();

      addToast({
        message: alreadyActive
          ? 'Os benefícios já estão disponíveis.'
          : 'Copie o código e autorize o pagamento no aplicativo do seu banco.',
        title: alreadyActive ? 'Crypt Pro ativo' : 'Pix Automático criado',
        tone: 'success',
      });
    },
  });

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start.mutate(payer);
  }

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
            role="dialog"
          >
            <section className="panel my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto border border-white/10 bg-[#0d1020] p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Pix Automático</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Autorize R$ 5 por mês</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-crypt-muted">
                    Os dados abaixo são enviados diretamente ao Asaas para identificar o pagador. O
                    Crypt não guarda CPF, telefone ou endereço.
                  </p>
                </div>

                <button
                  aria-label="Fechar"
                  className="shrink-0 rounded-xl p-2 text-crypt-muted transition hover:bg-white/10 hover:text-white"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold text-crypt-muted">
                    Nome completo
                  </span>
                  <input
                    autoComplete="name"
                    className="input w-full"
                    maxLength={120}
                    onChange={(event) =>
                      setPayer((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    value={payer.name}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold text-crypt-muted">
                    CPF ou CNPJ
                  </span>
                  <input
                    autoComplete="off"
                    className="input w-full"
                    inputMode="numeric"
                    maxLength={18}
                    onChange={(event) =>
                      setPayer((current) => ({
                        ...current,
                        cpfCnpj: event.target.value,
                      }))
                    }
                    placeholder="Somente números"
                    required
                    value={payer.cpfCnpj}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold text-crypt-muted">Celular</span>
                  <input
                    autoComplete="tel"
                    className="input w-full"
                    inputMode="tel"
                    maxLength={16}
                    onChange={(event) =>
                      setPayer((current) => ({
                        ...current,
                        mobilePhone: event.target.value,
                      }))
                    }
                    placeholder="DDD + número"
                    required
                    value={payer.mobilePhone}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold text-crypt-muted">CEP</span>
                  <input
                    autoComplete="postal-code"
                    className="input w-full"
                    inputMode="numeric"
                    maxLength={9}
                    onChange={(event) =>
                      setPayer((current) => ({
                        ...current,
                        postalCode: event.target.value,
                      }))
                    }
                    required
                    value={payer.postalCode}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold text-crypt-muted">
                    Número do endereço
                  </span>
                  <input
                    autoComplete="address-line2"
                    className="input w-full"
                    maxLength={20}
                    onChange={(event) =>
                      setPayer((current) => ({
                        ...current,
                        addressNumber: event.target.value,
                      }))
                    }
                    required
                    value={payer.addressNumber}
                  />
                </label>

                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button
                    leadingIcon={<Smartphone size={16} />}
                    loading={start.isPending}
                    type="submit"
                  >
                    Gerar Pix Automático
                  </Button>

                  <Button onClick={() => setOpen(false)} type="button" variant="secondary">
                    Voltar
                  </Button>
                </div>
              </form>

              {details ? (
                <PixCode
                  details={details}
                  onCopied={() =>
                    addToast({
                      message: 'Cole o código no aplicativo do seu banco.',
                      title: 'Código Pix copiado',
                      tone: 'success',
                    })
                  }
                />
              ) : null}

              <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-5 text-crypt-subtle">
                O Crypt Pro só é liberado após o Asaas confirmar o primeiro pagamento e a
                autorização recorrente.
              </p>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Button
        leadingIcon={<QrCode aria-hidden="true" size={16} />}
        onClick={() => setOpen(true)}
        variant="secondary"
      >
        Pix Automático
      </Button>

      {modal}
    </>
  );
}

export function ArcanaPixAutomaticManager({ active, onChanged, pending, provider }: ManagerProps) {
  const { addToast } = useToast();
  const isPix = provider === 'asaas_pix';
  const [details, setDetails] = useState<ArcanaPixDetails | null>(null);

  const load = useMutation({
    mutationFn: getArcanaPixAutomatic,
    onSuccess: setDetails,
  });

  const sync = useMutation({
    mutationFn: syncArcanaPixAutomatic,
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível atualizar o Pix',
        tone: 'error',
      });
    },
    onSuccess: async (nextDetails) => {
      setDetails(nextDetails);
      await onChanged();
      addToast({
        message: 'O estado da autorização foi consultado diretamente no Asaas.',
        title: 'Pix Automático atualizado',
        tone: 'success',
      });
    },
  });

  const cancel = useMutation({
    mutationFn: cancelArcanaPixAutomatic,
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível cancelar o Pix Automático',
        tone: 'error',
      });
    },
    onSuccess: async () => {
      await onChanged();
      setDetails((current) =>
        current ? { ...current, payload: null, status: 'cancelled' } : current,
      );
      addToast({
        message: 'Não haverá novas cobranças pelo Pix Automático.',
        title: 'Pix Automático cancelado',
        tone: 'info',
      });
    },
  });

  useEffect(() => {
    if (isPix && !load.isPending && !details) {
      load.mutate();
    }
  }, [details, isPix, load]);

  if (!isPix) return null;

  const stateLabel =
    details?.status === 'active'
      ? 'Ativo'
      : details?.status === 'created'
        ? 'Aguardando autorização'
        : details?.status === 'cancelled'
          ? 'Cancelado'
          : details?.status === 'refused'
            ? 'Recusado'
            : details?.status === 'expired'
              ? 'Expirado'
              : pending
                ? 'Aguardando autorização'
                : active
                  ? 'Ativo'
                  : 'Carregando';

  return (
    <section className="panel mt-6 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Pix Automático Asaas</p>
          <h2 className="mt-2 text-xl font-bold text-white">Gerenciar autorização</h2>
          <p className="mt-4 flex items-center gap-2 text-sm text-crypt-muted">
            <ShieldCheck className="text-cyan-300" size={16} />
            Estado: {stateLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            leadingIcon={<RefreshCw size={15} />}
            loading={sync.isPending}
            onClick={() => sync.mutate()}
            size="sm"
            variant="secondary"
          >
            Atualizar
          </Button>

          {details?.status !== 'cancelled' &&
          details?.status !== 'expired' &&
          details?.status !== 'refused' ? (
            <Button
              leadingIcon={<XCircle size={15} />}
              loading={cancel.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'Cancelar o Pix Automático do Crypt Pro? Não haverá nova cobrança.',
                  )
                ) {
                  cancel.mutate();
                }
              }}
              size="sm"
              variant="danger"
            >
              Cancelar Pix
            </Button>
          ) : null}
        </div>
      </div>

      {details ? (
        <PixCode
          details={details}
          onCopied={() =>
            addToast({
              message: 'Cole o código no aplicativo do seu banco.',
              title: 'Código Pix copiado',
              tone: 'success',
            })
          }
        />
      ) : null}

      <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-5 text-crypt-subtle">
        O primeiro Pix confirma o pagamento e autoriza as próximas mensalidades. O cancelamento
        interrompe novas cobranças.
      </p>
    </section>
  );
}
