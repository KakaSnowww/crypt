import { AtSign, Image, LockKeyhole, Music2, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../features/auth/useAuth';
import { AvatarEditor } from '../features/profile/components/AvatarEditor';
import { InterestEditor } from '../features/profile/components/InterestEditor';
import { PrivacySettingsForm } from '../features/profile/components/PrivacySettingsForm';
import { ProfileDetailsForm } from '../features/profile/components/ProfileDetailsForm';
import { SpotifyTrackEditor } from '../features/profile/components/SpotifyTrackEditor';
import {
  useCurrentProfile,
  useInterestCatalog,
  useProfileSettings,
  useSelectedInterestIds,
} from '../features/profile/profile.queries';

export function ProfileSettingsRoute() {
  const { user } = useAuth();
  const profileQuery = useCurrentProfile(user?.id ?? null);
  const settingsQuery = useProfileSettings(user?.id ?? null);
  const catalogQuery = useInterestCatalog();
  const selectionsQuery = useSelectedInterestIds(user?.id ?? null);
  const isLoading =
    profileQuery.isPending ||
    settingsQuery.isPending ||
    catalogQuery.isPending ||
    selectionsQuery.isPending;

  if (isLoading) {
    return (
      <div
        aria-label="Carregando configurações do perfil"
        className="grid min-h-72 place-items-center"
      >
        <Spinner />
      </div>
    );
  }

  if (
    profileQuery.error ||
    settingsQuery.error ||
    catalogQuery.error ||
    selectionsQuery.error ||
    !profileQuery.data ||
    !settingsQuery.data ||
    !catalogQuery.data
  ) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section className="panel p-7 text-center">
          <h1 className="text-xl font-semibold text-white">
            Não foi possível abrir as configurações
          </h1>
          <p className="mt-2 text-sm text-crypt-muted">Atualize a página e tente novamente.</p>
        </section>
      </main>
    );
  }

  const profile = profileQuery.data;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Perfil e privacidade</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Escolha como aparecer
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Tudo que foi escolhido no onboarding pode ser alterado aqui.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          to="/app/perfil"
        >
          Ver meu perfil
        </Link>
      </div>

      <section className="panel mt-8 p-5 sm:p-7" aria-labelledby="identity-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
            <UserRound aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="identity-title">
              Apresentação
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Nome repetível, biografia opcional e identificador único.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-5">
          <Input
            disabled
            helperText="A troca de identificador terá limites próprios em uma fase posterior."
            label="Identificador"
            leadingIcon={<AtSign aria-hidden="true" size={17} />}
            value={profile.handle}
          />
          <ProfileDetailsForm profile={profile} />
        </div>
      </section>

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="avatar-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
            <Image aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="avatar-title">
              Avatar
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Arquivo validado e armazenado na sua própria pasta.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <AvatarEditor profile={profile} />
        </div>
      </section>

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="interests-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-200">
            <Sparkles aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="interests-title">
              Interesses e autodescrições
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Tudo é opcional. Personalidade não representa diagnóstico.
            </p>
          </div>
        </div>
        <div className="mt-7">
          <InterestEditor
            categories={catalogQuery.data}
            selectedInterestIds={selectionsQuery.data ?? []}
          />
        </div>
      </section>

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="privacy-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-200">
            <LockKeyhole aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="privacy-title">
              Privacidade
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Interesses ficam ocultos até você autorizar.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <PrivacySettingsForm settings={settingsQuery.data} />
        </div>
      </section>

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="spotify-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-500/10 text-green-300">
            <Music2 aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="spotify-title">
              Música favorita
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Link validado e exibido no player oficial do Spotify.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <SpotifyTrackEditor profile={profile} />
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-crypt-subtle">
        Senha, sessão e exclusão continuam disponíveis em{' '}
        <Link className="font-semibold text-violet-300" to="/app/conta">
          Conta e segurança
        </Link>
        .
      </p>
    </main>
  );
}
