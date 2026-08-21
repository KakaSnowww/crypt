import {
  CalendarDays,
  Code2,
  EyeOff,
  Gamepad2,
  Headphones,
  Pencil,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ArcanaTierBadge } from '../features/arcana/ArcanaTierBadge';
import { useArcanaMembership } from '../features/arcana/arcana.queries';
import { useAuth } from '../features/auth/useAuth';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { SpotifyEmbed } from '../features/profile/components/SpotifyEmbed';
import { getProfileMediaUrl } from '../features/profile/profile.service';
import { classNames } from '../lib/classNames';
import { useMyPresencePreferences } from '../features/connections/presence.queries';
import {
  normalizePresenceStatus,
  presenceStatusInformation,
} from '../features/connections/presence.types';
import {
  useCurrentProfile,
  useInterestCatalog,
  useProfileSettings,
  useSelectedInterestIds,
} from '../features/profile/profile.queries';

export function ProfileRoute() {
  const { user } = useAuth();
  const arcanaMembership = useArcanaMembership();
  const profileQuery = useCurrentProfile(user?.id ?? null);
  const settingsQuery = useProfileSettings(user?.id ?? null);
  const catalogQuery = useInterestCatalog();
  const selectionQuery = useSelectedInterestIds(user?.id ?? null);
  const presenceQuery = useMyPresencePreferences();
  const isLoading =
    profileQuery.isPending ||
    settingsQuery.isPending ||
    catalogQuery.isPending ||
    selectionQuery.isPending;
  const error =
    profileQuery.error ?? settingsQuery.error ?? catalogQuery.error ?? selectionQuery.error;

  if (isLoading) {
    return (
      <div aria-label="Carregando perfil" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (error || !profileQuery.data || !settingsQuery.data || !catalogQuery.data) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section className="panel p-7 text-center">
          <h1 className="text-xl font-semibold text-white">Não foi possível abrir seu perfil</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Tente atualizar a página em alguns segundos.
          </p>
        </section>
      </main>
    );
  }

  const profile = profileQuery.data;
  const settings = settingsQuery.data;
  const selectedIds = new Set(selectionQuery.data ?? []);
  const visibleCategories = catalogQuery.data
    .map((category) => ({
      ...category,
      interests: category.interests.filter((interest) => selectedIds.has(interest.id)),
    }))
    .filter((category) => category.interests.length > 0);
  const interestsVisible = settings.show_interests_on_profile && !settings.hide_all_interests;
  const joinedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date(profile.created_at));
  const bannerUrl = getProfileMediaUrl(profile.banner_path);

  const interestCount = visibleCategories.reduce(
    (total, category) => total + category.interests.length,
    0,
  );
  const presence = presenceStatusInformation[normalizePresenceStatus(presenceQuery.data?.status)];

  return (
    <main className="profile-v3 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="profile-v3__toolbar">
        <div>
          <p className="eyebrow">Seu espaço público</p>
          <h1>Perfil</h1>
          <p>Veja exatamente como as outras pessoas encontram você.</p>
        </div>
        <Link to="/app/perfil/editar">
          <Button leadingIcon={<Pencil aria-hidden="true" size={16} />}>Editar perfil</Button>
        </Link>
      </header>

      <section
        aria-label="Banner do perfil"
        className={classNames('profile-v3__cover', `profile-effect-${profile.profile_effect}`)}
        style={
          bannerUrl
            ? {
                backgroundImage: `linear-gradient(0deg, rgb(7 7 15 / 70%), transparent 70%), url("${bannerUrl}")`,
              }
            : undefined
        }
      />

      <div className="profile-v3__layout">
        <aside className="profile-v3__identity">
          <div className="profile-v3__avatar">
            <ProfileAvatar
              avatarPath={profile.avatar_path}
              displayName={profile.display_name}
              positionX={profile.avatar_position_x}
              positionY={profile.avatar_position_y}
              size="lg"
              zoom={profile.avatar_zoom}
            />
            <span className={presence.tone} title={presence.label} />
          </div>
          <div className="profile-v3__name">
            <h2>{profile.display_name}</h2>
            <p>@{profile.handle}</p>
          </div>
          <div className="profile-v3__status">
            <span className={presence.tone} />
            {presence.label}
          </div>
          {arcanaMembership.data?.is_active ? (
            <ArcanaTierBadge
              tierColor={arcanaMembership.data.tier_color}
              tierName={arcanaMembership.data.tier_name}
              tierNumber={arcanaMembership.data.tier_number}
            />
          ) : null}
          <p className="profile-v3__bio">
            {presenceQuery.data?.customStatus ?? 'Nenhum status personalizado definido.'}
          </p>
          <dl className="profile-v3__meta">
            <div>
              <dt>
                <CalendarDays size={15} />
                Entrou no Crypt
              </dt>
              <dd>{joinedAt}</dd>
            </div>
            <div>
              <dt>
                <Gamepad2 size={15} />
                Interesses visíveis
              </dt>
              <dd>{interestCount}</dd>
            </div>
          </dl>
        </aside>

        <div className="profile-v3__content">
          <section className="profile-v3__panel profile-v3__about">
            <header>
              <Code2 size={19} />
              <div>
                <p className="eyebrow">Sobre mim</p>
                <h2>Identidade</h2>
              </div>
            </header>
            <p>{profile.bio ?? 'Este espaço ainda não possui uma apresentação.'}</p>
          </section>

          <section className="profile-v3__panel" aria-labelledby="profile-interests-title">
            <header>
              <Sparkles size={19} />
              <div>
                <p className="eyebrow">Afinidades</p>
                <h2 id="profile-interests-title">Interesses</h2>
              </div>
            </header>
            {interestsVisible && visibleCategories.length > 0 ? (
              <div className="profile-v3__interests">
                {visibleCategories.map((category) => (
                  <div key={category.id}>
                    <h3>{category.label}</h3>
                    <div>
                      {category.interests.map((interest) => (
                        <span key={interest.id}>{interest.label}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-v3__empty">
                <EyeOff size={17} />
                <p>
                  {visibleCategories.length === 0
                    ? 'Nenhum interesse selecionado.'
                    : 'Interesses privados.'}
                </p>
              </div>
            )}
          </section>

          <section className="profile-v3__panel" aria-labelledby="favorite-track-title">
            <header>
              <Headphones size={19} />
              <div>
                <p className="eyebrow">Destaque musical</p>
                <h2 id="favorite-track-title">Música do perfil</h2>
              </div>
            </header>
            <div className="profile-v3__spotify">
              <SpotifyEmbed
                title={profile.favorite_spotify_title}
                url={profile.favorite_spotify_url}
              />
            </div>
          </section>

          <section className="profile-v3__privacy">
            <ShieldCheck size={18} />
            <div>
              <strong>Você controla o que aparece</strong>
              <p>E-mail e dados privados nunca são exibidos no perfil.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
