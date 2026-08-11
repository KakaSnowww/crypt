import { BookMarked, CalendarDays, EyeOff, Feather, Pencil, ShieldCheck } from 'lucide-react';
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
    <main className="grimoire-profile mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Arquivo pessoal</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-white">Meu grimório</h1>
          <p className="mt-1 text-sm text-crypt-muted">
            Sua identidade registrada nas páginas do Crypt.
          </p>
        </div>
        <Link to="/app/perfil/editar">
          <Button leadingIcon={<Pencil aria-hidden="true" size={16} />} variant="secondary">
            Editar perfil
          </Button>
        </Link>
      </header>

      <article className="grimoire-book" aria-label="Grimório de perfil">
        <section className="grimoire-page grimoire-page--left">
          <div className="grimoire-rune-ring" aria-hidden="true" />
          <p className="grimoire-kicker">Tomo pessoal · identidade</p>
          <div className="relative z-[2] mt-10 flex flex-col items-center text-center">
            <div className="grimoire-avatar-frame">
              <ProfileAvatar
                avatarPath={profile.avatar_path}
                displayName={profile.display_name}
                size="lg"
              />
            </div>
            <div className="mt-6 flex max-w-full flex-wrap items-center justify-center gap-2">
              <h2 className="grimoire-name truncate text-3xl font-black">{profile.display_name}</h2>
              {arcanaMembership.data?.is_active ? (
                <ArcanaTierBadge
                  tierColor={arcanaMembership.data.tier_color}
                  tierName={arcanaMembership.data.tier_name}
                  tierNumber={arcanaMembership.data.tier_number}
                />
              ) : null}
            </div>
            <p className="grimoire-handle mt-1 text-sm">@{profile.handle}</p>
            <div className="grimoire-divider my-6 w-full" />
            <Feather aria-hidden="true" className="text-[#6f5734]" size={20} />
            <p className="grimoire-copy mt-3 max-w-md whitespace-pre-wrap text-sm leading-7">
              {profile.bio ?? 'Estas páginas ainda aguardam sua história.'}
            </p>
            <p className="grimoire-meta mt-6 flex items-center gap-2 text-xs font-semibold">
              <CalendarDays aria-hidden="true" size={15} /> No Crypt desde {joinedAt}
            </p>
          </div>
          {bannerUrl ? (
            <div
              className={classNames(
                'profile-visual-preview absolute inset-x-6 bottom-6 h-16 opacity-20',
                `profile-effect-${profile.profile_effect}`,
              )}
              style={{ backgroundImage: `url("${bannerUrl}")` }}
            />
          ) : null}
        </section>

        <section
          className="grimoire-page grimoire-page--right"
          aria-labelledby="profile-interests-title"
        >
          <div className="relative z-[2]">
            <div className="flex items-center gap-3">
              <BookMarked aria-hidden="true" className="text-[#416b50]" size={23} />
              <div>
                <p className="grimoire-kicker">Capítulo I</p>
                <h2 className="grimoire-section-title mt-1" id="profile-interests-title">
                  Afinidades e interesses
                </h2>
              </div>
            </div>
            <p className="grimoire-meta mt-3 text-xs">
              Marcas que descrevem os caminhos percorridos por você.
            </p>

            {interestsVisible && visibleCategories.length > 0 ? (
              <div className="mt-6 grid gap-5">
                {visibleCategories.map((category) => (
                  <div key={category.id}>
                    <h3 className="grimoire-kicker">{category.label}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {category.interests.map((interest) => (
                        <span className="grimoire-chip px-3 py-1.5" key={interest.id}>
                          {interest.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grimoire-inset mt-6 flex items-start gap-3 p-4">
                <EyeOff aria-hidden="true" className="mt-0.5 shrink-0 text-[#53664e]" size={18} />
                <p className="grimoire-copy text-sm leading-6">
                  {visibleCategories.length === 0
                    ? 'Nenhum interesse foi selecionado ainda.'
                    : 'Seus interesses estão privados e não aparecem nesta prévia pública.'}
                </p>
              </div>
            )}
            <div className="grimoire-divider my-7" />
            <p className="grimoire-kicker">Capítulo II</p>
            <h2 className="grimoire-section-title mt-1" id="favorite-track-title">
              Melodia vinculada
            </h2>
            <p className="grimoire-meta mt-2 text-xs">A música preservada entre estas páginas.</p>
            <div className="grimoire-inset mt-4 p-3">
              <SpotifyEmbed
                title={profile.favorite_spotify_title}
                url={profile.favorite_spotify_url}
              />
            </div>
          </div>
          <span className="grimoire-bookmark" aria-hidden="true" />
        </section>
      </article>

      <section className="grimoire-note mt-7 flex items-start gap-3 rounded-2xl p-4 text-sm text-crypt-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={18} />
        <p className="leading-6">
          Seu e-mail nunca aparece no perfil. Você controla separadamente interesses, mensagens,
          pedidos, presença e informações em comum.
        </p>
      </section>
    </main>
  );
}
