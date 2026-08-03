import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Gamepad2, Music2, RefreshCw, Tv, Unplug } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Toggle } from '../components/common/Toggle';
import { useToast } from '../components/common/ToastContext';
import { useAuth } from '../features/auth/useAuth';
import {
  disconnectExternalConnection,
  fetchExternalConnections,
  openExternalAuthorization,
  refreshExternalConnection,
  startExternalConnection,
  updateExternalConnectionVisibility,
  type ExternalConnection,
  type ExternalProvider,
} from '../features/externalConnections/externalConnections.service';
import { SettingsNavigation } from '../features/profile/components/SettingsNavigation';

const providers = [
  {
    description: 'Identidade e música reproduzida no momento.',
    icon: Music2,
    id: 'spotify',
    name: 'Spotify',
  },
  {
    description: 'Perfil público, avatar e jogos visíveis na Steam.',
    icon: Gamepad2,
    id: 'steam',
    name: 'Steam',
  },
  {
    description: 'Canal, avatar e números públicos do YouTube.',
    icon: Tv,
    id: 'youtube',
    name: 'YouTube',
  },
] as const satisfies ReadonlyArray<{
  description: string;
  icon: typeof Music2;
  id: ExternalProvider;
  name: string;
}>;

const callbackErrors: Record<string, string> = {
  account_already_connected: 'Essa conta já está vinculada a outro perfil do Crypt.',
  access_denied: 'Você cancelou a autorização no provedor.',
  invalid_state: 'A autorização expirou. Tente conectar novamente.',
  provider_error: 'O provedor não conseguiu concluir a autorização.',
  provider_not_configured: 'As credenciais desse provedor ainda não estão disponíveis.',
  steam_profile_unavailable: 'A Steam não disponibilizou esse perfil.',
  youtube_channel_not_found: 'A conta escolhida não possui um canal do YouTube.',
};

function connectionSummary(connection: ExternalConnection) {
  if (connection.provider === 'spotify') {
    return connection.current_activity
      ? `${connection.current_activity.title}${connection.current_activity.subtitle ? ` — ${connection.current_activity.subtitle}` : ''}`
      : 'Nenhuma música tocando agora.';
  }

  if (connection.provider === 'youtube') {
    const subscribers = connection.details.subscriber_count;
    const videos = connection.details.video_count;
    return [
      subscribers === null || subscribers === undefined
        ? null
        : `${new Intl.NumberFormat('pt-BR').format(subscribers)} inscritos`,
      videos === null || videos === undefined
        ? null
        : `${new Intl.NumberFormat('pt-BR').format(videos)} vídeos`,
    ]
      .filter(Boolean)
      .join(' • ');
  }

  const gameCount = connection.details.game_count;
  const currentGame = connection.details.current_game_name;
  if (currentGame) return `Jogando ${currentGame}`;
  return gameCount === null || gameCount === undefined
    ? 'Biblioteca privada ou indisponível.'
    : `${new Intl.NumberFormat('pt-BR').format(gameCount)} jogos visíveis`;
}

export function ConnectedAccountsRoute() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const queryKey = ['external-connections', user?.id] as const;
  const query = useQuery({
    enabled: Boolean(user),
    queryFn: fetchExternalConnections,
    queryKey,
    refetchInterval: 60_000,
  });
  const refreshQuery = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['external-connections', user?.id] }),
    [queryClient, user?.id],
  );

  useEffect(() => {
    const status = searchParams.get('oauth_status');
    const provider = searchParams.get('oauth_provider');
    if (!status || !provider) return;

    const providerName = providers.find((item) => item.id === provider)?.name ?? 'Conta';
    if (status === 'success') {
      addToast({
        message: 'Agora você pode escolher o que aparece no seu perfil.',
        title: `${providerName} conectado`,
        tone: 'success',
      });
      void refreshQuery();
    } else {
      const code = searchParams.get('oauth_error') ?? 'provider_error';
      addToast({
        message: callbackErrors[code] ?? callbackErrors.provider_error,
        title: `Não foi possível conectar ${providerName}`,
        tone: 'error',
      });
    }

    const next = new URLSearchParams(searchParams);
    next.delete('oauth_error');
    next.delete('oauth_provider');
    next.delete('oauth_status');
    setSearchParams(next, { replace: true });
  }, [addToast, refreshQuery, searchParams, setSearchParams]);

  const start = useMutation({
    mutationFn: async (provider: ExternalProvider) => {
      const url = await startExternalConnection(provider);
      openExternalAuthorization(url);
      return provider;
    },
    onError: (error: Error, provider) => {
      const providerName = providers.find((item) => item.id === provider)?.name ?? 'conta';
      addToast({
        message: error.message,
        title: `Não foi possível abrir ${providerName}`,
        tone: 'error',
      });
    },
    onSuccess: (provider) => {
      const providerName = providers.find((item) => item.id === provider)?.name ?? 'provedor';
      addToast({
        message: 'Conclua a autorização no navegador. O Crypt será reaberto ao terminar.',
        title: `${providerName} aberto`,
        tone: 'info',
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      provider,
      values,
    }: {
      provider: ExternalProvider;
      values: { show_activity?: boolean; show_on_profile?: boolean };
    }) => updateExternalConnectionVisibility(user!.id, provider, values),
    onError: (error: Error) =>
      addToast({ message: error.message, title: 'Não foi possível salvar', tone: 'error' }),
    onSuccess: refreshQuery,
  });

  const synchronize = useMutation({
    mutationFn: refreshExternalConnection,
    onError: (error: Error) =>
      addToast({ message: error.message, title: 'Sincronização indisponível', tone: 'error' }),
    onSuccess: (_result, provider) => {
      const providerName = providers.find((item) => item.id === provider)?.name ?? 'Conta';
      addToast({
        message: 'Os dados públicos foram atualizados.',
        title: providerName,
        tone: 'success',
      });
      void refreshQuery();
    },
  });

  const remove = useMutation({
    mutationFn: disconnectExternalConnection,
    onError: (error: Error) =>
      addToast({ message: error.message, title: 'Não foi possível desconectar', tone: 'error' }),
    onSuccess: (_result, provider) => {
      const providerName = providers.find((item) => item.id === provider)?.name ?? 'Conta';
      addToast({
        message: 'Tokens, atividade e dados vinculados foram removidos do Crypt.',
        title: `${providerName} desconectado`,
        tone: 'info',
      });
      void refreshQuery();
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <SettingsNavigation />
      <p className="eyebrow">Contas conectadas</p>
      <h1 className="mt-3 text-3xl font-bold text-white">Sua identidade, em um só lugar</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
        A autorização acontece diretamente no Spotify, Google ou Steam. O Crypt não recebe sua senha
        e os tokens ficam cifrados no backend.
      </p>

      {query.error ? (
        <p className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {query.error.message}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4">
        {providers.map(({ description, icon: Icon, id, name }) => {
          const connection = query.data?.find((item) => item.provider === id);
          const isStarting = start.isPending && start.variables === id;
          const isRefreshing = synchronize.isPending && synchronize.variables === id;
          const isRemoving = remove.isPending && remove.variables === id;

          return (
            <section className="panel p-5" key={id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-violet-200">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-white">{name}</h2>
                    <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                      {connection ? `Conectado como ${connection.display_name}` : description}
                    </p>
                    {connection ? (
                      <p className="mt-2 text-xs leading-5 text-violet-200/85">
                        {connectionSummary(connection) || 'Dados públicos sincronizados.'}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {connection ? (
                    <>
                      {connection.profile_url ? (
                        <Button
                          leadingIcon={<ExternalLink size={15} />}
                          onClick={() => openExternalAuthorization(connection.profile_url!)}
                          size="sm"
                          variant="ghost"
                        >
                          Abrir perfil
                        </Button>
                      ) : null}
                      <Button
                        leadingIcon={<RefreshCw size={15} />}
                        loading={isRefreshing}
                        onClick={() => synchronize.mutate(id)}
                        size="sm"
                        variant="secondary"
                      >
                        Atualizar
                      </Button>
                      <Button
                        leadingIcon={<Unplug size={15} />}
                        loading={isRemoving}
                        onClick={() => {
                          if (window.confirm(`Desconectar ${name} do seu perfil?`))
                            remove.mutate(id);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button
                      leadingIcon={<ExternalLink size={15} />}
                      loading={isStarting}
                      onClick={() => start.mutate(id)}
                      size="sm"
                    >
                      Conectar
                    </Button>
                  )}
                </div>
              </div>

              {connection ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Toggle
                    checked={connection.show_on_profile}
                    description="Exibe a identidade e os dados públicos desta conta."
                    label="Mostrar no perfil"
                    onChange={(value) =>
                      update.mutate({ provider: id, values: { show_on_profile: value } })
                    }
                  />
                  {id === 'spotify' ? (
                    <Toggle
                      checked={connection.show_activity}
                      description="Atualiza a música atual enquanto o Crypt estiver aberto."
                      label="Mostrar atividade"
                      onChange={(value) =>
                        update.mutate({ provider: id, values: { show_activity: value } })
                      }
                    />
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-violet-400/[0.06] px-4 py-3 text-xs leading-5 text-violet-100/80">
                  Ao clicar em Conectar, o navegador oficial do provedor será aberto. Depois da
                  autorização, você voltará automaticamente ao Crypt.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
