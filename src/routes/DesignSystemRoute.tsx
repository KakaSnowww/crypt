import { KeyRound, Mail, Save, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/common/Skeleton';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../components/common/ToastContext';

export function DesignSystemRoute() {
  const [modalOpen, setModalOpen] = useState(false);
  const { addToast } = useToast();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <p className="eyebrow">Sistema visual</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Componentes do Crypt
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
          Esta rota reúne os elementos fundamentais para testes manuais de aparência, teclado, foco
          e estados.
        </p>
      </header>

      <div className="mt-10 grid gap-5">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Botões</h2>
          <p className="mt-1 text-sm text-crypt-subtle">Variações e estados reutilizáveis.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button leadingIcon={<Sparkles aria-hidden="true" size={16} />}>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Discreto</Button>
            <Button leadingIcon={<TriangleAlert aria-hidden="true" size={16} />} variant="danger">
              Destrutivo
            </Button>
            <Button loading>Carregando</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Campos</h2>
          <p className="mt-1 text-sm text-crypt-subtle">
            Rótulos, ajuda, ícones e mensagens de validação.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Input
              helperText="Esse endereço nunca aparecerá publicamente."
              label="E-mail"
              leadingIcon={<Mail aria-hidden="true" size={17} />}
              placeholder="voce@exemplo.com"
              type="email"
            />
            <Input
              errorText="A senha precisa ter pelo menos oito caracteres."
              label="Senha"
              leadingIcon={<KeyRound aria-hidden="true" size={17} />}
              placeholder="Digite sua senha"
              type="password"
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="panel p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Modal e notificações</h2>
            <p className="mt-1 text-sm text-crypt-subtle">
              Camadas acessíveis para confirmação e feedback.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setModalOpen(true)} variant="secondary">
                Abrir modal
              </Button>
              <Button
                onClick={() =>
                  addToast({
                    message: 'As preferências visuais foram atualizadas.',
                    tone: 'success',
                  })
                }
              >
                Mostrar sucesso
              </Button>
              <Button
                onClick={() =>
                  addToast({
                    message: 'A ação simulada não pôde ser concluída.',
                    tone: 'error',
                  })
                }
                variant="danger"
              >
                Mostrar erro
              </Button>
            </div>
          </article>

          <article className="panel p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Carregamento</h2>
            <p className="mt-1 text-sm text-crypt-subtle">
              Indicadores com movimento reduzido respeitado.
            </p>
            <div className="mt-6 flex items-center gap-5">
              <Spinner label="Carregando exemplo" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          </article>
        </section>
      </div>

      <Modal
        description="Essa janela prende o foco, anuncia título e descrição e pode ser fechada com Esc."
        footer={
          <>
            <Button onClick={() => setModalOpen(false)} variant="ghost">
              Cancelar
            </Button>
            <Button
              leadingIcon={<Save aria-hidden="true" size={16} />}
              onClick={() => {
                setModalOpen(false);
                addToast({
                  message: 'A demonstração foi salva com sucesso.',
                  tone: 'success',
                });
              }}
            >
              Salvar demonstração
            </Button>
          </>
        }
        onOpenChange={setModalOpen}
        open={modalOpen}
        title="Confirmar demonstração"
      >
        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4 text-sm leading-6 text-crypt-muted">
          Nenhum dado real será alterado. Este conteúdo existe para validar o comportamento do
          componente.
        </div>
      </Modal>
    </div>
  );
}
