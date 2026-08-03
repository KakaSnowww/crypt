import { ExternalLink, Gamepad2, Music2, Radio, Tv } from 'lucide-react';
import type { Json } from '../../types/database';

type PublicAccount = {
  avatar_url: null | string;
  details: Record<string, unknown>;
  display_name: string;
  last_synced_at: null | string;
  profile_url: null | string;
  provider: 'spotify' | 'steam' | 'youtube';
};

type PublicActivity = {
  ends_at: null | string;
  external_url: null | string;
  image_url: null | string;
  provider: 'spotify';
  started_at: null | string;
  subtitle: null | string;
  title: string;
  type: 'listening';
};

const providerInformation = {
  spotify: { icon: Music2, label: 'Spotify' },
  steam: { icon: Gamepad2, label: 'Steam' },
  youtube: { icon: Tv, label: 'YouTube' },
} as const;

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parseAccounts(value: Json): PublicAccount[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isUnknownRecord(item)) return [];
    const provider = item.provider;
    const displayName = item.display_name;
    if (
      (provider !== 'spotify' && provider !== 'steam' && provider !== 'youtube') ||
      typeof displayName !== 'string'
    ) {
      return [];
    }

    return [
      {
        avatar_url: isSafeHttpsUrl(item.avatar_url) ? item.avatar_url : null,
        details: isUnknownRecord(item.details) ? item.details : {},
        display_name: displayName,
        last_synced_at: typeof item.last_synced_at === 'string' ? item.last_synced_at : null,
        profile_url: isSafeHttpsUrl(item.profile_url) ? item.profile_url : null,
        provider,
      },
    ];
  });
}

function parseActivity(value: Json): null | PublicActivity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (
    value.provider !== 'spotify' ||
    value.type !== 'listening' ||
    typeof value.title !== 'string'
  ) {
    return null;
  }

  return {
    ends_at: typeof value.ends_at === 'string' ? value.ends_at : null,
    external_url: isSafeHttpsUrl(value.external_url) ? value.external_url : null,
    image_url: isSafeHttpsUrl(value.image_url) ? value.image_url : null,
    provider: 'spotify',
    started_at: typeof value.started_at === 'string' ? value.started_at : null,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : null,
    title: value.title,
    type: 'listening',
  };
}

function numericDetail(details: Record<string, unknown>, name: string) {
  const value = details[name];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function accountSubtitle(account: PublicAccount) {
  if (account.provider === 'youtube') {
    const subscribers = numericDetail(account.details, 'subscriber_count');
    const videos = numericDetail(account.details, 'video_count');
    return [
      subscribers === null
        ? null
        : `${new Intl.NumberFormat('pt-BR').format(subscribers)} inscritos`,
      videos === null ? null : `${new Intl.NumberFormat('pt-BR').format(videos)} vídeos`,
    ]
      .filter(Boolean)
      .join(' • ');
  }

  if (account.provider === 'steam') {
    const currentGame = account.details.current_game_name;
    if (typeof currentGame === 'string' && currentGame) return `Jogando ${currentGame}`;
    const gameCount = numericDetail(account.details, 'game_count');
    return gameCount === null
      ? 'Biblioteca privada'
      : `${new Intl.NumberFormat('pt-BR').format(gameCount)} jogos visíveis`;
  }

  const followers = numericDetail(account.details, 'followers');
  return followers === null
    ? 'Conta verificada'
    : `${new Intl.NumberFormat('pt-BR').format(followers)} seguidores`;
}

type PublicSteamGame = {
  appId: null | number;
  iconUrl: null | string;
  name: string;
  playtime: number;
};

function steamGames(account: PublicAccount): PublicSteamGame[] {
  const games = account.details.games;
  if (account.provider !== 'steam' || !isUnknownArray(games)) return [];

  return games.flatMap((game): PublicSteamGame[] => {
    if (!isUnknownRecord(game)) return [];
    const name = game.name;
    if (typeof name !== 'string') return [];

    return [
      {
        appId: numericDetail(game, 'app_id'),
        iconUrl: isSafeHttpsUrl(game.icon_url) ? game.icon_url : null,
        name,
        playtime: numericDetail(game, 'playtime_minutes') ?? 0,
      },
    ];
  });
}

export function ConnectedAccountsProfileSection({
  connectedAccounts,
  currentActivity,
}: {
  connectedAccounts: Json;
  currentActivity: Json;
}) {
  const accounts = parseAccounts(connectedAccounts);
  const activity = parseActivity(currentActivity);

  if (!accounts.length && !activity) return null;

  return (
    <section className="mt-5 panel p-5 sm:p-7" aria-labelledby="connected-accounts-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
          <Radio aria-hidden="true" size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-white" id="connected-accounts-title">
            Contas conectadas
          </h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Identidades confirmadas diretamente pelos provedores.
          </p>
        </div>
      </div>

      {activity ? (
        <a
          className="mt-5 flex items-center gap-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 transition hover:bg-emerald-400/[0.09]"
          href={activity.external_url ?? undefined}
          rel="noreferrer"
          target={activity.external_url ? '_blank' : undefined}
        >
          {activity.image_url ? (
            <img
              alt=""
              className="size-14 rounded-xl object-cover"
              loading="lazy"
              src={activity.image_url}
            />
          ) : (
            <span className="grid size-14 place-items-center rounded-xl bg-black/20 text-emerald-200">
              <Music2 aria-hidden="true" size={22} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Ouvindo agora
            </span>
            <span className="mt-1 block truncate font-semibold text-white">{activity.title}</span>
            {activity.subtitle ? (
              <span className="mt-0.5 block truncate text-xs text-crypt-muted">
                {activity.subtitle}
              </span>
            ) : null}
          </span>
          {activity.external_url ? <ExternalLink aria-hidden="true" size={16} /> : null}
        </a>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const information = providerInformation[account.provider];
          const Icon = information.icon;
          const content = (
            <>
              {account.avatar_url ? (
                <img
                  alt=""
                  className="size-11 rounded-xl object-cover"
                  loading="lazy"
                  src={account.avatar_url}
                />
              ) : (
                <span className="grid size-11 place-items-center rounded-xl bg-white/[0.06] text-violet-200">
                  <Icon aria-hidden="true" size={20} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-crypt-subtle">
                  {information.label}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-white">
                  {account.display_name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-crypt-muted">
                  {accountSubtitle(account) || 'Conta conectada'}
                </span>
              </span>
              {account.profile_url ? <ExternalLink aria-hidden="true" size={15} /> : null}
            </>
          );

          return account.profile_url ? (
            <a
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 transition hover:bg-white/[0.06]"
              href={account.profile_url}
              key={account.provider}
              rel="noreferrer"
              target="_blank"
            >
              {content}
            </a>
          ) : (
            <div
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"
              key={account.provider}
            >
              {content}
            </div>
          );
        })}
      </div>

      {accounts.flatMap(steamGames).length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-crypt-subtle">
            Jogos mais usados na Steam
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {accounts.flatMap(steamGames).map((game) => (
              <div
                className="flex min-w-52 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-3"
                key={`${game.appId ?? game.name}-${game.name}`}
              >
                {game.iconUrl ? (
                  <img alt="" className="size-10 rounded-lg object-cover" src={game.iconUrl} />
                ) : (
                  <span className="grid size-10 place-items-center rounded-lg bg-white/[0.05] text-crypt-muted">
                    <Gamepad2 aria-hidden="true" size={18} />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white">
                    {game.name}
                  </span>
                  <span className="mt-1 block text-[0.7rem] text-crypt-subtle">
                    {Math.round(game.playtime / 60)} h registradas
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
