import { Gem, Music2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from '../../../components/common/IconButton';
import { Spinner } from '../../../components/common/Spinner';
import { usePublicConnectionProfile } from '../../connections/connections.queries';
import { getProfileMediaUrl } from '../profile.service';
import { ProfileAvatar } from './ProfileAvatar';
type Activity = {
  external_url?: null | string;
  image_url?: null | string;
  subtitle?: null | string;
  title: string;
};
export function MemberProfileCard({ handle, onClose }: { handle: string; onClose: () => void }) {
  const query = usePublicConnectionProfile(handle);
  const profile = query.data;
  if (query.isPending)
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
        <Spinner />
      </div>
    );
  if (!profile) return null;
  const banner = getProfileMediaUrl(profile.banner_path);
  const activity =
    profile.current_activity &&
    typeof profile.current_activity === 'object' &&
    !Array.isArray(profile.current_activity)
      ? (profile.current_activity as Activity)
      : undefined;
  const gradient =
    profile.profile_gradient_start && profile.profile_gradient_end
      ? `linear-gradient(${profile.profile_gradient_angle}deg,${profile.profile_gradient_start},${profile.profile_gradient_end})`
      : undefined;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
    >
      <article
        className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111522]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-28 bg-gradient-to-br from-violet-700 to-blue-700"
          style={
            banner
              ? {
                  backgroundImage: `url("${banner}")`,
                  backgroundPosition: `${profile.banner_position_x}% ${profile.banner_position_y}%`,
                  backgroundSize: `${profile.banner_zoom * 100}%`,
                  backgroundRepeat: 'no-repeat',
                }
              : gradient
                ? { background: gradient }
                : undefined
          }
        />
        <IconButton
          className="absolute right-3 top-3 bg-black/50"
          icon={<X size={16} />}
          label="Fechar perfil"
          onClick={onClose}
        />
        <div className="relative px-5 pb-5">
          <ProfileAvatar
            avatarPath={profile.avatar_path}
            className="-mt-12 ring-4 ring-[#111522]"
            displayName={profile.display_name}
            positionX={profile.avatar_position_x}
            positionY={profile.avatar_position_y}
            size="lg"
            zoom={profile.avatar_zoom}
          />
          <h2 className="mt-3 text-xl font-bold text-white">{profile.display_name}</h2>
          <p className="text-sm text-crypt-subtle">@{profile.handle}</p>
          {profile.arcana_active ? (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
              <Gem size={12} /> Arcana {profile.arcana_tier_name}
            </span>
          ) : null}
          <p className="mt-4 text-sm text-crypt-muted">
            {profile.bio ?? 'Sem biografia por enquanto.'}
          </p>
          {activity ? (
            <a
              className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-400/[0.06] p-3"
              href={activity.external_url ?? undefined}
              rel="noreferrer"
              target="_blank"
            >
              {activity.image_url ? (
                <img alt="" className="size-11 rounded-lg" src={activity.image_url} />
              ) : (
                <Music2 />
              )}
              <span>
                <strong className="block text-sm text-white">{activity.title}</strong>
                <span className="text-xs text-crypt-subtle">{activity.subtitle}</span>
              </span>
            </a>
          ) : null}
          <Link
            className="mt-5 flex min-h-10 items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white"
            to={`/app/pessoas/${profile.handle}`}
          >
            Abrir perfil completo
          </Link>
        </div>
      </article>
    </div>
  );
}
