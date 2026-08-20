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

  return (
    <main className="profile-hub mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="profile-hub__toolbar">
        <div>
          <p className="eyebrow">Player identity</p>
          <h1>Seu perfil</h1>
          <p>A central pública da sua identidade no Crypt.</p>
        </div>
        <Link to="/app/perfil/editar">
          <Button leadingIcon={<Pencil aria-hidden="true" size={16} />} variant="secondary">
            Personalizar perfil
          </Button>
        </Link>
      </header>

      <section
        className={classNames('profile-hub__hero', `profile-effect-${profile.profile_effect}`)}
        style={
          bannerUrl
            ? {
                backgroundImage: `linear-gradient(90deg, rgb(7 7 15 / 92%), rgb(7 7 15 / 32%)), url("${bannerUrl}")`,
              }
            : undefined
        }
      >
        <div className="profile-hub__signal">
          <span /> ONLINE
        </div>
        <div className="profile-hub__identity">
          <div className="profile-hub__avatar">
            <ProfileAvatar
              avatarPath={profile.avatar_path}
              displayName={profile.display_name}
              positionX={profile.avatar_position_x}
              positionY={profile.avatar_position_y}
              size="lg"
              zoom={profile.avatar_zoom}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2>{profile.display_name}</h2>
              {arcanaMembership.data?.is_active ? (
                <ArcanaTierBadge
                  tierColor={arcanaMembership.data.tier_color}
                  tierName={arcanaMembership.data.tier_name}
                  tierNumber={arcanaMembership.data.tier_number}
                />
              ) : null}
            </div>
            <p className="profile-hub__handle">@{profile.handle}</p>
            <p className="profile-hub__bio">
              {profile.bio ?? 'Adicione uma bio para contar à comunidade quem você é.'}
            </p>
          </div>
        </div>
      </section>

      <section className="profile-hub__stats" aria-label="Resumo do perfil">
        <div>
          <Code2 />
          <span>
            <strong>DEV / GAMER</strong>Identidade
          </span>
        </div>
        <div>
          <Gamepad2 />
          <span>
            <strong>{interestCount}</strong>Interesses
          </span>
        </div>
        <div>
          <CalendarDays />
          <span>
            <strong>{joinedAt}</strong>Membro desde
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Protegido</strong>Privacidade
          </span>
        </div>
      </section>

      <div className="profile-hub__dashboard">
        <section className="profile-module" aria-labelledby="profile-interests-title">
          <header>
            <span>
              <Sparkles size={18} />
            </span>
            <div>
              <p className="eyebrow">Loadout pessoal</p>
              <h2 id="profile-interests-title">Interesses e stacks</h2>
            </div>
          </header>
          {interestsVisible && visibleCategories.length > 0 ? (
            <div className="profile-module__interests">
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
            <div className="profile-module__empty">
              <EyeOff size={18} />
              <p>
                {visibleCategories.length === 0
                  ? 'Nenhum interesse foi selecionado ainda.'
                  : 'Seus interesses estão privados nesta visualização.'}
              </p>
            </div>
          )}
        </section>

        <aside
          className="profile-module profile-module--audio"
          aria-labelledby="favorite-track-title"
        >
          <header>
            <span>
              <Headphones size={18} />
            </span>
            <div>
              <p className="eyebrow">Now playing</p>
              <h2 id="favorite-track-title">Som do perfil</h2>
            </div>
          </header>
          <div className="profile-module__spotify">
            <SpotifyEmbed
              title={profile.favorite_spotify_title}
              url={profile.favorite_spotify_url}
            />
          </div>
          <div className="profile-module__privacy">
            <ShieldCheck size={17} />
            <p>Seu e-mail nunca é exibido. Você controla cada informação compartilhada.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
