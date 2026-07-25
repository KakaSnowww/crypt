import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Music2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../features/auth/useAuth';
import { AvatarEditor } from '../features/profile/components/AvatarEditor';
import { InterestSelector } from '../features/profile/components/InterestSelector';
import { PrivacySettingsForm } from '../features/profile/components/PrivacySettingsForm';
import { ProfileDetailsForm } from '../features/profile/components/ProfileDetailsForm';
import { SpotifyTrackEditor } from '../features/profile/components/SpotifyTrackEditor';
import { toProfileActionError } from '../features/profile/profile.errors';
import {
  profileKeys,
  useCurrentProfile,
  useInterestCatalog,
  useProfileSettings,
  useSelectedInterestIds,
} from '../features/profile/profile.queries';
import {
  completeOnboarding,
  saveInterestCategory,
  saveOnboardingStep,
} from '../features/profile/profile.service';

const TOTAL_STEPS = 9;
const interestStepSlugs = ['musica', 'filmes-series', 'jogos', 'hobbies', 'personalidade'] as const;

export function OnboardingRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const profileQuery = useCurrentProfile(user?.id ?? null);
  const settingsQuery = useProfileSettings(user?.id ?? null);
  const catalogQuery = useInterestCatalog();
  const selectionsQuery = useSelectedInterestIds(user?.id ?? null);
  const [stepOverride, setStepOverride] = useState<null | number>(null);
  const [selectionOverride, setSelectionOverride] = useState<null | number[]>(null);
  const [avatarIsUploading, setAvatarIsUploading] = useState(false);

  const progressMutation = useMutation({
    mutationFn: async (nextStep: number) => {
      if (user) {
        await saveOnboardingStep(user.id, nextStep);
      }
      return nextStep;
    },
    onSuccess: async (nextStep) => {
      if (user) {
        await queryClient.invalidateQueries({ queryKey: profileKeys.settings(user.id) });
      }
      setStepOverride(nextStep);
      window.scrollTo({ behavior: 'smooth', top: 0 });
    },
  });
  const categoryMutation = useMutation({
    mutationFn: async ({
      categorySlug,
      interestIds,
      nextStep,
    }: {
      categorySlug: string;
      interestIds: number[];
      nextStep: number;
    }) => {
      await saveInterestCategory(categorySlug, interestIds);
      if (user) {
        await saveOnboardingStep(user.id, nextStep);
      }
      return nextStep;
    },
    onSuccess: async (nextStep) => {
      if (user) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: profileKeys.selections(user.id) }),
          queryClient.invalidateQueries({ queryKey: profileKeys.settings(user.id) }),
        ]);
      }
      setStepOverride(nextStep);
      window.scrollTo({ behavior: 'smooth', top: 0 });
    },
  });
  const completionMutation = useMutation({
    mutationFn: async () => {
      if (user) {
        await completeOnboarding(user.id);
      }
    },
    onSuccess: async () => {
      if (user) {
        await queryClient.invalidateQueries({ queryKey: profileKeys.settings(user.id) });
      }
      void navigate('/app/perfil', { replace: true });
    },
  });

  const isLoading =
    profileQuery.isPending ||
    settingsQuery.isPending ||
    catalogQuery.isPending ||
    selectionsQuery.isPending;
  const loadError =
    profileQuery.error ?? settingsQuery.error ?? catalogQuery.error ?? selectionsQuery.error;
  const actionError = progressMutation.error ?? categoryMutation.error ?? completionMutation.error;

  if (isLoading) {
    return (
      <div
        aria-label="Preparando onboarding"
        className="grid min-h-dvh place-items-center bg-crypt-background"
      >
        <Spinner />
      </div>
    );
  }

  if (loadError || !profileQuery.data || !settingsQuery.data || !catalogQuery.data || !user) {
    return (
      <main className="grid min-h-dvh place-items-center bg-crypt-background px-4">
        <section className="panel max-w-lg p-7 text-center">
          <h1 className="text-xl font-semibold text-white">Não foi possível iniciar seu perfil</h1>
          <p className="mt-3 text-sm leading-6 text-crypt-muted">
            {loadError
              ? toProfileActionError(loadError).message
              : 'Sua sessão precisa ser atualizada.'}
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </section>
      </main>
    );
  }

  const settings = settingsQuery.data;

  if (settings.onboarding_completed_at) {
    return <Navigate replace to="/app/perfil" />;
  }

  const profile = profileQuery.data;
  const step = stepOverride ?? settings.onboarding_step;
  const selection = selectionOverride ?? selectionsQuery.data ?? [];
  const currentCategorySlug = step >= 2 && step <= 6 ? interestStepSlugs[step - 2] : undefined;
  const currentCategory = currentCategorySlug
    ? catalogQuery.data.find((category) => category.slug === currentCategorySlug)
    : undefined;
  const currentCategoryIds = new Set(
    currentCategory?.interests.map((interest) => interest.id) ?? [],
  );
  const currentCategorySelection = selection.filter((id) => currentCategoryIds.has(id));
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const isTransitioning =
    progressMutation.isPending || categoryMutation.isPending || completionMutation.isPending;

  function goToStep(nextStep: number) {
    void progressMutation.mutateAsync(nextStep).catch(() => undefined);
  }

  function renderStep() {
    if (step === 0) {
      return (
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-violet-500/25 to-blue-500/25 text-violet-100 ring-1 ring-white/10">
            <PartyPopper aria-hidden="true" size={30} />
          </span>
          <p className="eyebrow mt-6">Bem-vindo ao Crypt</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Vamos deixar seu espaço com a sua cara
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-crypt-muted">
            Interesses, biografia, avatar e música são opcionais. Você decide o que aparece e poderá
            editar tudo depois.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              leadingIcon={<ArrowRight aria-hidden="true" size={17} />}
              loading={progressMutation.isPending}
              onClick={() => goToStep(1)}
              size="lg"
            >
              Começar
            </Button>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div>
          <StepHeading
            description="Seu nome pode se repetir. A biografia e a imagem são opcionais."
            icon={<UserRound aria-hidden="true" size={23} />}
            title="Como você quer aparecer?"
          />
          <div className="mt-7 grid gap-8">
            <AvatarEditor onBusyChange={setAvatarIsUploading} profile={profile} />
            <ProfileDetailsForm
              disabled={avatarIsUploading}
              onSaved={() => goToStep(2)}
              profile={profile}
              submitLabel="Salvar e escolher interesses"
            />
            <Button
              className="w-fit"
              disabled={isTransitioning || avatarIsUploading}
              onClick={() => goToStep(0)}
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Voltar
            </Button>
          </div>
        </div>
      );
    }

    if (currentCategory) {
      return (
        <div>
          <StepHeading
            description={currentCategory.description}
            icon={<Sparkles aria-hidden="true" size={23} />}
            title={currentCategory.label}
          />
          {currentCategory.slug === 'personalidade' ? (
            <p className="mt-4 rounded-2xl border border-blue-400/10 bg-blue-500/[0.055] p-4 text-xs leading-5 text-blue-100/80">
              Estas opções são apenas autodescrições. Não representam diagnóstico ou avaliação
              psicológica.
            </p>
          ) : null}
          <div className="mt-7">
            <InterestSelector
              category={currentCategory}
              onChange={(nextCategorySelection) => {
                setSelectionOverride([
                  ...selection.filter((id) => !currentCategoryIds.has(id)),
                  ...nextCategorySelection,
                ]);
              }}
              selectedInterestIds={currentCategorySelection}
            />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button disabled={isTransitioning} onClick={() => goToStep(step - 1)} variant="ghost">
              <ArrowLeft aria-hidden="true" size={16} />
              Voltar
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isTransitioning} onClick={() => goToStep(step + 1)} variant="ghost">
                Pular por agora
              </Button>
              <Button
                loading={categoryMutation.isPending}
                onClick={() =>
                  void categoryMutation
                    .mutateAsync({
                      categorySlug: currentCategory.slug,
                      interestIds: currentCategorySelection,
                      nextStep: step + 1,
                    })
                    .catch(() => undefined)
                }
              >
                Salvar e continuar
                <ArrowRight aria-hidden="true" size={16} />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div>
          <StepHeading
            description="Começamos com seus interesses ocultos. Ative somente o que fizer sentido."
            icon={<ShieldCheck aria-hidden="true" size={23} />}
            title="Você controla sua privacidade"
          />
          <div className="mt-7">
            <PrivacySettingsForm
              onSaved={() => goToStep(8)}
              settings={settings}
              submitLabel="Salvar e continuar"
            />
          </div>
          <Button
            className="mt-4"
            disabled={isTransitioning}
            onClick={() => goToStep(6)}
            variant="ghost"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Voltar
          </Button>
        </div>
      );
    }

    return (
      <div>
        <StepHeading
          description="Cole o link de uma faixa. O player e os dados vêm diretamente do Spotify."
          icon={<Music2 aria-hidden="true" size={23} />}
          title="Uma música que combina com você"
        />
        <div className="mt-7">
          <SpotifyTrackEditor
            onSaved={() => void completionMutation.mutateAsync().catch(() => undefined)}
            profile={profile}
          />
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <Button disabled={isTransitioning} onClick={() => goToStep(7)} variant="ghost">
            <ArrowLeft aria-hidden="true" size={16} />
            Voltar
          </Button>
          <Button
            leadingIcon={<CheckCircle2 aria-hidden="true" size={17} />}
            loading={completionMutation.isPending}
            onClick={() => void completionMutation.mutateAsync().catch(() => undefined)}
            variant={profile.favorite_spotify_url ? 'primary' : 'secondary'}
          >
            {profile.favorite_spotify_url ? 'Concluir onboarding' : 'Concluir sem música'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-crypt-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-32 -top-40 size-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 size-96 rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img alt="" aria-hidden="true" className="size-10" src="/crypt-mark.svg" />
            <div>
              <p className="text-sm font-semibold text-white">Crypt</p>
              <p className="text-xs text-crypt-subtle">Seu primeiro perfil</p>
            </div>
          </div>
          <p className="text-xs font-medium text-crypt-muted">
            Etapa {step + 1} de {TOTAL_STEPS}
          </p>
        </header>

        <div
          aria-label={`Progresso do onboarding: ${Math.round(progress)}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="onboarding-card panel mt-6 p-5 sm:p-8">{renderStep()}</section>

        {actionError ? (
          <p
            aria-live="polite"
            className="mx-auto mt-4 max-w-xl text-center text-xs leading-5 text-red-300"
          >
            {toProfileActionError(actionError).message}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function StepHeading({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-100 ring-1 ring-white/[0.08]">
        {icon}
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-crypt-muted">{description}</p>
      </div>
    </div>
  );
}
