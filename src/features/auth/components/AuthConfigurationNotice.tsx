import { DatabaseZap } from 'lucide-react';
import { supabaseConfigurationMessage } from '../../../lib/config/env';
import { useAuth } from '../useAuth';

export function AuthConfigurationNotice() {
  const { status } = useAuth();

  if (status !== 'unconfigured') {
    return null;
  }

  return (
    <div
      className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3.5 text-xs leading-5 text-amber-100"
      role="status"
    >
      <DatabaseZap aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
      <p>
        <strong className="block text-sm">Configuração necessária</strong>
        {supabaseConfigurationMessage}
      </p>
    </div>
  );
}
