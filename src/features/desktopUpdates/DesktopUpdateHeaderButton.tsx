import { Download, LoaderCircle, Rocket, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { Modal } from '../../components/common/Modal';
import { releaseNoteLines } from './releaseNotes';
import { useDesktopUpdates } from './useDesktopUpdates';

export function DesktopUpdateHeaderButton() {
  const { restartAndInstall, state } = useDesktopUpdates();
  const [open, setOpen] = useState(false);

  if (!state || !['available', 'downloading', 'ready'].includes(state.state)) return null;

  const downloading = state.state === 'downloading';
  const ready = state.state === 'ready';
  const HeaderIcon = ready ? Rocket : downloading ? LoaderCircle : Download;
  const notes = releaseNoteLines(state.releaseNotes);
  const label = ready
    ? `Instalar atualização ${state.version ?? ''}`.trim()
    : downloading
      ? `Baixando atualização: ${state.percent ?? 0}%`
      : `Atualização ${state.version ?? ''} disponível`.trim();

  return (
    <>
      <div className="relative">
        <IconButton
          className="border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          icon={
            <HeaderIcon
              aria-hidden="true"
              className={downloading ? 'animate-spin' : ''}
              size={18}
            />
          }
          label={label}
          onClick={() => setOpen(true)}
        />
        <span className="pointer-events-none absolute right-1 top-1 size-2.5 rounded-full border-2 border-crypt-background bg-emerald-400" />
      </div>

      <Modal
        description={`Versão atual: ${state.currentVersion} · Nova versão: ${state.version ?? 'disponível'}`}
        footer={
          ready ? (
            <Button leadingIcon={<Rocket size={17} />} onClick={() => void restartAndInstall()}>
              Reiniciar e instalar
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)} variant="secondary">
              Continuar em segundo plano
            </Button>
          )
        }
        onOpenChange={setOpen}
        open={open}
        title={state.releaseName || (ready ? 'Atualização pronta' : 'Atualizando o Crypt')}
      >
        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4">
          <div className="flex items-center gap-3">
            <Sparkles aria-hidden="true" className="text-violet-200" size={19} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {ready
                  ? 'Tudo pronto para a instalação'
                  : downloading
                    ? `Download em andamento · ${state.percent ?? 0}%`
                    : 'Nova versão encontrada'}
              </p>
              <p className="mt-1 text-xs leading-5 text-crypt-muted">
                {ready
                  ? 'O Crypt será fechado, atualizado e aberto novamente.'
                  : 'Você pode continuar usando o aplicativo durante o download.'}
              </p>
            </div>
          </div>
          {downloading ? (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-[width]"
                style={{ width: `${state.percent ?? 2}%` }}
              />
            </div>
          ) : null}
        </div>

        {notes.length ? (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-white">O que muda nesta versão</h3>
            <ul className="mt-3 grid gap-2 text-xs leading-5 text-crypt-muted">
              {notes.map((line) => (
                <li className="flex gap-2" key={line}>
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-400"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Modal>
    </>
  );
}
