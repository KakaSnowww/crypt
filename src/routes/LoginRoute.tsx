import { KeyRound, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useToast } from '../components/common/ToastContext';

export function LoginRoute() {
  const { addToast } = useToast();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addToast({
      message: 'A autenticação real será conectada ao Supabase na Fase 3.',
      title: 'Tela pronta para integração',
      tone: 'info',
    });
  }

  return (
    <section aria-labelledby="login-title">
      <p className="eyebrow">Acesse sua conta</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white" id="login-title">
        Que bom ter você de volta
      </h1>
      <p className="mt-3 text-sm leading-6 text-crypt-muted">
        Entre para continuar suas conversas e encontrar sua comunidade.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="E-mail"
          leadingIcon={<Mail aria-hidden="true" size={17} />}
          placeholder="voce@exemplo.com"
          required
          type="email"
        />
        <Input
          autoComplete="current-password"
          label="Senha"
          leadingIcon={<KeyRound aria-hidden="true" size={17} />}
          placeholder="Digite sua senha"
          required
          type="password"
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-crypt-muted">
            <input
              className="size-4 rounded border-white/20 bg-crypt-elevated accent-violet-500"
              type="checkbox"
            />
            Manter conectado
          </label>
          <button
            className="rounded-lg text-xs font-medium text-violet-300 hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus"
            type="button"
          >
            Esqueci minha senha
          </button>
        </div>

        <Button className="mt-1 w-full" size="lg" type="submit">
          Entrar no Crypt
        </Button>
      </form>

      <p className="mt-7 text-center text-xs text-crypt-subtle">
        Esta é uma prévia estrutural.{' '}
        <Link
          className="font-medium text-violet-300 hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus"
          to="/app"
        >
          Voltar ao aplicativo
        </Link>
      </p>
    </section>
  );
}
