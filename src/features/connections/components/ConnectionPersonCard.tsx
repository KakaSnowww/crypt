import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';

type ConnectionPersonCardProps = {
  actions?: ReactNode;
  avatarPath: null | string;
  badges?: ReactNode;
  description?: null | string;
  displayName: string;
  handle: string;
  status?: ReactNode;
};

export function ConnectionPersonCard({
  actions,
  avatarPath,
  badges,
  description,
  displayName,
  handle,
  status,
}: ConnectionPersonCardProps) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/[0.13]">
      <div className="flex min-w-0 items-start gap-3">
        <ProfileAvatar avatarPath={avatarPath} displayName={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              className="group inline-flex min-w-0 items-center gap-1.5 font-semibold text-white hover:text-violet-200"
              to={`/app/pessoas/${handle}`}
            >
              <span className="truncate">{displayName}</span>
              <ExternalLink
                aria-hidden="true"
                className="shrink-0 opacity-0 transition group-hover:opacity-100"
                size={13}
              />
            </Link>
            {status}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-violet-300">@{handle}</p>
          {description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-crypt-muted">{description}</p>
          ) : null}
          {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}
        </div>
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2 sm:pl-[4.75rem]">{actions}</div> : null}
    </article>
  );
}
