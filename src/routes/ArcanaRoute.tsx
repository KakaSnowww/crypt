import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CreditCard,
  HardDriveUpload,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useEffect, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../components/common/ToastContext';
import { arcanaKeys, useArcanaMembership } from '../features/arcana/arcana.queries';
import {
  cancelArcanaSubscription,
  openArcanaCheckout,
  startArcanaCheckout,
  syncArcanaBilling,
} from '../features/arcana/arcanaBilling.service';
import {
  applyArcanaRune,
  fetchMyArcanaRunes,
  removeArcanaRune,
} from '../features/arcana/arcana.service';
import { arcanaMembershipStatusLabels, arcanaTiers } from '../features/arcana/arcana.types';
import { useAuth } from '../features/auth/useAuth';
import { useMyServers } from '../features/servers/servers.queries';

const benefits = [
  {
    icon: Radio,
    title: 'Transmissão Windows HD a 60 FPS',
    text: 'Mais fluidez ao compartilhar jogos no aplicativo Windows.',
  },
  {
    icon: HardDriveUpload,
    title: 'Arquivos maiores',
    text: 'Envios de até 500 MB em canais e conversas.',
  },
  {
    icon: Zap,
    title: '3 Boosts de Comunidade',
    text: 'Aplique seus benefícios em até três servidores.',
  },
  {
    icon: Sparkles,
    title: 'Identidade avançada',
    text: 'Avatar GIF de até 5 MB, efeitos e gradiente exclusivo.',
  },
] as const;

const proTierNames = [
  'Core',
  'Operator',
  'Coder',
  'Striker',
  'Vanguard',
  'Elite',
  'Master',
  'Nova',
  'Titan',
  'Apex',
  'Legend',
  'Infinite',
] as const;

function formatDate(value: null | string) {
  if (!value) return null;

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date(value));
}

export function ArcanaRoute() {
  const membership = useArcanaMembership();
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const servers = useMyServers();
  const runesKey = ['arcana', 'runes', user?.id] as const;

  const runes = useQuery({
    enabled: Boolean(user),
    queryFn: () => fetchMyArcanaRunes(user!.id),
    queryKey: runesKey,
  });

  async function refreshArcana() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: arcanaKeys.membership,
      }),
      queryClient.invalidateQueries({ queryKey: runesKey }),
      queryClient.invalidateQueries({ queryKey: ['server-arcana'] }),
    ]);
  }

  const startBilling = useMutation({
    mutationFn: startArcanaCheckout,
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível abrir a assinatura',
        tone: 'error',
      });
    },
    onSuccess: async ({ alreadyActive, checkoutUrl }) => {
      if (alreadyActive) {
        await refreshArcana();
        addToast({
          message: 'Os benefícios já estão disponíveis nesta conta.',
          title: 'Crypt Pro ativo',
          tone: 'success',
        });
        return;
      }

      if (checkoutUrl) {
        openArcanaCheckout(checkoutUrl);
        addToast({
          message: 'Conclua a assinatura no Checkout Asaas. O Crypt será reaberto ao terminar.',
          title: 'Checkout aberto',
          tone: 'info',
        });
      }
    },
  });

  const synchronizeBilling = useMutation({
    mutationFn: syncArcanaBilling,
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível verificar a assinatura',
        tone: 'error',
      });
    },
    onSuccess: async () => {
      await refreshArcana();
      addToast({
        message: 'O estado mais recente foi consultado diretamente no Asaas.',
        title: 'Crypt Pro atualizado',
        tone: 'success',
      });
    },
  });

  const cancelBilling = useMutation({
    mutationFn: cancelArcanaSubscription,
    onError: (error: Error) => {
      addToast({
        message: error.message,
        title: 'Não foi possível cancelar',
        tone: 'error',
      });
    },
    onSuccess: async (result) => {
      await refreshArcana();
      const accessUntil =
        typeof result.access_until === 'string' ? formatDate(result.access_until) : null;

      addToast({
        message: accessUntil
          ? `Não haverá nova cobrança. Seus benefícios continuam até ${accessUntil}.`
          : 'A cobrança recorrente foi cancelada.',
        title: 'Assinatura cancelada',
        tone: 'info',
      });
    },
  });

  const applyRune = useMutation({
    mutationFn: ({ serverId, slot }: { serverId: string; slot: number }) =>
      applyArcanaRune(serverId, slot),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: runesKey }),
        queryClient.invalidateQueries({ queryKey: ['server-arcana'] }),
      ]);
    },
  });

  const clearRune = useMutation({
    mutationFn: removeArcanaRune,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: runesKey }),
        queryClient.invalidateQueries({ queryKey: ['server-arcana'] }),
      ]);
    },
  });

  const callbackStatus = searchParams.get('billing_status');

  useEffect(() => {
    if (callbackStatus !== 'return') return;

    const next = new URLSearchParams(searchParams);
    next.delete('billing_status');
    setSearchParams(next, { replace: true });

    let active = true;

    void syncArcanaBilling()
      .then(async () => {
        if (!active) return;
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: arcanaKeys.membership,
          }),
          queryClient.invalidateQueries({
            queryKey: ['arcana', 'runes', user?.id],
          }),
        ]);
        addToast({
          message:
            'O Asaas foi consultado. O Crypt Pro será liberado somente depois da confirmação financeira.',
          title: 'Retorno do Checkout',
          tone: 'success',
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        addToast({
          message:
            error instanceof Error ? error.message : 'Abra o Crypt Pro novamente e use Atualizar.',
          title: 'Verificação pendente',
          tone: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [addToast, callbackStatus, queryClient, searchParams, setSearchParams, user?.id]);

  if (membership.isPending) {
    return (
      <div className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  const data = membership.data;
  const active = data?.is_active === true;
  const pending = data?.status === 'pending';
  const canceledWithAccess = data?.status === 'canceled' && active;
  const periodEnd = formatDate(data?.current_period_ends_at ?? null);
  const asaasSubscription = data?.provider === 'asaas';

  return (
    <main className="pro-v4 mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 sm:py-7">
      <header className="pro-v4__topbar">
        <div>
          <span>CRYPT PRO // 01</span>
          <div>
            <p className="eyebrow">Performance layer</p>
            <h1>Mais potência. Menos limites.</h1>
          </div>
        </div>
        <div className="pro-v4__network">
          <i /> BILLING ONLINE
        </div>
      </header>

      <section className="pro-v4__hero">
        <span aria-hidden="true" className="pro-v4__beam" />
        <div className="pro-v4__hero-copy">
          <p className="eyebrow flex items-center gap-2">
            <Zap aria-hidden="true" size={14} />
            Membership protocol
          </p>
          <h2>
            Desbloqueie o modo <em>PRO</em>.
          </h2>
          <p>
            Streaming mais fluido, arquivos maiores e uma identidade que se destaca. Tudo por
            <strong> R$ 5 por mês</strong>.
          </p>

          {membership.error ? <p className="pro-v4__error">{membership.error.message}</p> : null}

          {active ? (
            <div className="pro-v4__active">
              <Zap aria-hidden="true" className="text-emerald-300" size={20} />
              <strong className="text-white">
                Crypt Pro {proTierNames[(data?.tier_number ?? 1) - 1] ?? 'Core'}
              </strong>
              <span className="text-xs text-emerald-100/75">
                {canceledWithAccess ? 'cancelada, ainda ativa' : 'ativa'}
              </span>
            </div>
          ) : pending ? (
            <div className="pro-v4__pending">
              <strong className="text-sm text-amber-100">
                Aguardando confirmação do pagamento
              </strong>
              <p className="mt-1 text-xs leading-5 text-amber-100/70">
                Continue no Checkout Asaas ou use Atualizar caso o pagamento já tenha sido
                confirmado.
              </p>
            </div>
          ) : (
            <div className="pro-v4__checkout">
              <span>
                <b>R$ 5</b>
                <small>/mês</small>
              </span>
              <Button
                leadingIcon={<CreditCard aria-hidden="true" size={16} />}
                loading={startBilling.isPending}
                onClick={() => startBilling.mutate()}
              >
                Ativar Crypt Pro
              </Button>
            </div>
          )}
        </div>
        <div className="pro-v4__core" aria-hidden="true">
          <div>
            <span>PRO</span>
          </div>
          <i />
          <i />
          <i />
          <small>ENCRYPTED MEMBERSHIP</small>
        </div>
      </section>

      {(asaasSubscription || pending) && data ? (
        <section className="pro-v4__billing">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Assinatura Asaas</p>
              <h2 className="mt-2 text-xl font-bold text-white">Gerenciar Crypt Pro</h2>
              <div className="mt-4 grid gap-2 text-sm text-crypt-muted">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="text-violet-300" size={16} />
                  Estado: {arcanaMembershipStatusLabels[data.status]}
                </p>
                {periodEnd ? (
                  <p className="flex items-center gap-2">
                    <CalendarDays className="text-violet-300" size={16} />
                    {data.status === 'canceled'
                      ? `Benefícios até ${periodEnd}`
                      : `Próxima renovação em ${periodEnd}`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {pending ? (
                <Button
                  leadingIcon={<CreditCard size={15} />}
                  loading={startBilling.isPending}
                  onClick={() => startBilling.mutate()}
                  size="sm"
                >
                  Continuar pagamento
                </Button>
              ) : null}

              <Button
                leadingIcon={<RefreshCw size={15} />}
                loading={synchronizeBilling.isPending}
                onClick={() => synchronizeBilling.mutate()}
                size="sm"
                variant="secondary"
              >
                Atualizar
              </Button>

              {data.status !== 'canceled' &&
              data.status !== 'expired' &&
              data.status !== 'inactive' ? (
                <Button
                  leadingIcon={<XCircle size={15} />}
                  loading={cancelBilling.isPending}
                  onClick={() => {
                    if (
                      window.confirm('Cancelar a renovação do Crypt Pro? Não haverá nova cobrança.')
                    ) {
                      cancelBilling.mutate();
                    }
                  }}
                  size="sm"
                  variant="danger"
                >
                  Cancelar renovação
                </Button>
              ) : null}
            </div>
          </div>

          <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-5 text-crypt-subtle">
            O Crypt não recebe dados do cartão. A confirmação financeira é feita por Webhook e
            também consultada diretamente na API do Asaas.
          </p>
        </section>
      ) : null}

      <div className="pro-v4__section-title">
        <span>02</span>
        <div>
          <p className="eyebrow">Loadout</p>
          <h2>Seu pacote de vantagens</h2>
        </div>
        <i />
      </div>
      <section className="pro-v4__benefits">
        {benefits.map(({ icon: Icon, title, text }, index) => (
          <article className="pro-v4__benefit" key={title}>
            <div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <Icon />
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
            <footer>
              MODULE READY <i />
            </footer>
          </article>
        ))}
      </section>

      <section className="pro-v4__progress">
        <header>
          <span>03</span>
          <div>
            <p className="eyebrow">Progressão</p>
            <h2>Histórico de assinatura</h2>
          </div>
        </header>
        <div className="pro-v4__tier-grid">
          {arcanaTiers.map(([, color], index) => {
            const tierNumber = index + 1;
            const name = proTierNames[index];
            const currentTier = active ? Math.max(1, Math.min(12, data?.tier_number ?? 1)) : 0;
            const current = tierNumber === currentTier;
            const earned = active && tierNumber <= currentTier;

            return (
              <article
                className={`arcana-tier-card ${
                  current ? 'is-current' : earned ? 'is-earned' : 'is-locked'
                }`}
                key={name}
                style={
                  {
                    '--arcana-tier-color': color,
                  } as CSSProperties
                }
              >
                <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] font-mono text-sm font-black text-white">
                  {tierNumber.toString().padStart(2, '0')}
                </span>
                <strong className="block text-xs text-white">
                  {tierNumber}. {name}
                </strong>
                <span className="arcana-tier-card__state">
                  {current ? 'Seu nível' : earned ? 'Conquistado' : `${tierNumber}º mês`}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      {active ? (
        <section className="pro-v4__boosts">
          <header>
            <span>04</span>
            <div>
              <p className="eyebrow">Community power</p>
              <h2>Boosts de comunidade</h2>
            </div>
          </header>
          <div className="pro-v4__boost-grid">
            {[1, 2, 3].map((slot) => {
              const rune = runes.data?.find((item) => item.rune_slot === slot);

              return (
                <div className="pro-v4__boost" key={slot}>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.08] text-cyan-300">
                    <Zap aria-hidden="true" size={24} />
                  </span>
                  <p>BOOST SLOT // 0{slot}</p>
                  <select
                    className="mt-3 min-h-10 w-full rounded-xl bg-[#111522] text-white"
                    onChange={(event) => {
                      if (event.target.value) {
                        applyRune.mutate({
                          serverId: event.target.value,
                          slot,
                        });
                      }
                    }}
                    value={rune?.server_id ?? ''}
                  >
                    <option value="">Escolher servidor</option>
                    {servers.data?.map((server) => (
                      <option key={server.server_id} value={server.server_id}>
                        {server.server_name}
                      </option>
                    ))}
                  </select>
                  {rune ? (
                    <Button
                      className="mt-3"
                      leadingIcon={<Trash2 size={13} />}
                      onClick={() => clearRune.mutate(slot)}
                      size="sm"
                      variant="ghost"
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="mt-5 text-center text-xs text-crypt-subtle">
        Personalize em{' '}
        <Link className="text-violet-300" to="/app/perfil/editar">
          Editar perfil
        </Link>
        .
      </p>
    </main>
  );
}
