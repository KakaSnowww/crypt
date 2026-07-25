import { CircleAlert } from 'lucide-react';

export function AuthFormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3.5 text-sm leading-6 text-red-100"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="mt-1 shrink-0" size={17} />
      <p>{message}</p>
    </div>
  );
}
