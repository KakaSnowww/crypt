import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { Button } from '../components/common/Button';
import { Brand } from '../components/layout/Brand';

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Erro capturado pela proteção global do Crypt.', error, info);
    }
  }

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-dvh place-items-center px-5 py-12">
        <section className="panel w-full max-w-lg p-8 text-center sm:p-10">
          <Brand className="mx-auto w-fit" />
          <p className="eyebrow mt-10">Falha inesperada</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            O Crypt encontrou um problema
          </h1>
          <p className="mt-4 text-sm leading-6 text-crypt-muted">
            Sua sessão não foi apagada. Recarregue o aplicativo para tentar novamente.
          </p>
          <Button className="mt-8" onClick={() => window.location.reload()}>
            Recarregar aplicativo
          </Button>
        </section>
      </main>
    );
  }
}
