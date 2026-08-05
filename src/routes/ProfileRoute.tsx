import { CalendarDays, EyeOff, Pencil, ShieldCheck, Sparkles } from 'lucide-react';
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-crypt-panel shadow-2xl shadow-black/20">
        <div
          className={classNames(
            'profile-visual-preview relative h-36 overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 sm:h-44',
            `profile-effect-${profile.profile_effect}`,
          )}
          style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
        >
          <div className="absolute -right-16 -top-20 size-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-cyan-400/20 blur-3xl" />
        </div>
        <div className="relative px-5 pb-7 sm:px-8">
          <ProfileAvatar
            avatarPath={profile.avatar_path}
            className="-mt-14 ring-4 ring-crypt-panel sm:-mt-16"
            displayName={profile.display_name}
            size="lg"
          />
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-bold tracking-tight text-white">
                  {profile.display_name}
                </h1>
                {arcanaMembership.data?.is_active ? (
                  <ArcanaTierBadge
                    tierColor={arcanaMembership.data.tier_color}
                    tierName={arcanaMembership.data.tier_name}
                    tierNumber={arcanaMembership.data.tier_number}
                  />
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium text-violet-300">@{profile.handle}</p>
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-crypt-muted">
                {profile.bio ?? 'Esta pessoa ainda não escreveu uma biografia.'}
              </p>
              <p className="mt-4 flex items-center gap-2 text-xs text-crypt-subtle">
                <CalendarDays aria-hidden="true" size={15} />
                No Crypt desde {joinedAt}
              </p>
            </div>
            <Link to="/app/perfil/editar">
              <Button leadingIcon={<Pencil aria-hidden="true" size={16} />} variant="secondary">
                Editar perfil
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <section className="panel p-5 sm:p-7" aria-labelledby="profile-interests-title">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
              <Sparkles aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-white" id="profile-interests-title">
                Interesses
              </h2>
              <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                Um retrato opcional do que você gosta.
              </p>
            </div>
          </div>

          {interestsVisible && visibleCategories.length > 0 ? (
            <div className="mt-6 grid gap-5">
              {visibleCategories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.13em] text-crypt-subtle">
                    {category.label}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {category.interests.map((interest) => (
                      <span
                        className="rounded-xl border border-violet-400/15 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-100"
                        key={interest.id}
                      >
                        {interest.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <EyeOff aria-hidden="true" className="mt-0.5 shrink-0 text-crypt-subtle" size={18} />
              <p className="text-sm leading-6 text-crypt-muted">
                {visibleCategories.length === 0
                  ? 'Nenhum interesse foi selecionado ainda.'
                  : 'Seus interesses estão privados e não aparecem nesta prévia pública.'}
              </p>
            </div>
          )}
        </section>

        <section className="panel p-5 sm:p-7" aria-labelledby="favorite-track-title">
          <h2 className="font-semibold text-white" id="favorite-track-title">
            Música favorita
          </h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Player oficial incorporado do Spotify.
          </p>
          <div className="mt-5">
            <SpotifyEmbed
              title={profile.favorite_spotify_title}
              url={profile.favorite_spotify_url}
            />
          </div>
        </section>
      </div>

      <section className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.045] p-4 text-sm text-crypt-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={18} />
        <p className="leading-6">
          Seu e-mail nunca aparece no perfil. Você controla separadamente interesses, mensagens,
          pedidos, presença e informações em comum.
        </p>
      </section>
    </main>
  );
}
