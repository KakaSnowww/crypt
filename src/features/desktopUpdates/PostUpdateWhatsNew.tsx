import { BellRing, Download, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { isNativeRuntime } from '../../lib/platform';
import {
  getCurrentCryptRelease,
  pendingReleaseStorageKey,
  readPendingCryptRelease,
  releaseNoteLines,
  seenReleaseStorageKey,
} from './releaseNotes';

const highlightIcons = [BellRing, Volume2, Sparkles, ShieldCheck];

export function PostUpdateWhatsNew() {
  const bundledRelease = getCurrentCryptRelease();
  const pendingRelease = useMemo(
    () => (typeof window === 'undefined' ? null : readPendingCryptRelease(window.localStorage)),
    [],
  );
  const currentVersion = bundledRelease?.version ?? pendingRelease?.version;
  const [open, setOpen] = useState(() => {
    if (!isNativeRuntime() || !currentVersion) return false;
    return window.localStorage.getItem(seenReleaseStorageKey) !== currentVersion;
  });
  const dynamicNotes = releaseNoteLines(
    pendingRelease?.version === currentVersion ? pendingRelease.releaseNotes : undefined,
  );

  if (!currentVersion || (!bundledRelease && dynamicNotes.length === 0)) return null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) return;

    window.localStorage.setItem(seenReleaseStorageKey, currentVersion);
    window.localStorage.removeItem(pendingReleaseStorageKey);
  }

  return (
    <Modal
      description={`O Crypt foi atualizado para a versão ${currentVersion}. Veja o que ficou diferente.`}
      footer={<Button onClick={() => handleOpenChange(false)}>Começar a usar</Button>}
      onOpenChange={handleOpenChange}
      open={open}
      title={pendingRelease?.releaseName || bundledRelease?.title || 'Novidades do Crypt'}
    >
      <div className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-blue-500/5 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-violet-100">
            <Download aria-hidden="true" size={19} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
              Atualização concluída
            </p>
            <p className="mt-1 text-sm text-crypt-muted">
              {bundledRelease?.summary ?? 'Você já está usando os recursos mais recentes.'}
            </p>
          </div>
        </div>
      </div>

      {bundledRelease ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {bundledRelease.highlights.map((highlight, index) => {
            const HighlightIcon = highlightIcons[index % highlightIcons.length];
            return (
              <article
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                key={highlight.title}
              >
                <HighlightIcon aria-hidden="true" className="text-blue-200" size={18} />
                <h3 className="mt-3 text-sm font-semibold text-white">{highlight.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-crypt-muted">{highlight.description}</p>
              </article>
            );
          })}
        </div>
      ) : null}

      {dynamicNotes.length ? (
        <section className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <h3 className="text-sm font-semibold text-white">Notas desta versão</h3>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-crypt-muted">
            {dynamicNotes.map((line) => (
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
  );
}
