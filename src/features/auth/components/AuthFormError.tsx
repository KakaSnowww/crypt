import { CircleAlert } from 'lucide-react';

export function AuthFormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="auth-form-error" role="alert">
      <CircleAlert aria-hidden="true" size={16} />
      <p>{message}</p>
    </div>
  );
}
