import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  applyArcaneVisualMode,
  arcaneVisualModeLabel,
  getNextArcaneVisualMode,
  isArcaneVisualMode,
  readArcaneVisualMode,
  type ArcaneVisualMode,
} from './arcaneVisualMode';

type ParticleStyle = CSSProperties &
  Record<
    '--arcane-delay' | '--arcane-duration' | '--arcane-left' | '--arcane-size' | '--arcane-top',
    string
  >;

function deterministicParticles() {
  return Array.from({ length: 28 }, (_, index) => {
    const left = (index * 37 + 11) % 100;
    const top = (index * 53 + 7) % 100;
    const size = 1 + ((index * 7) % 4);
    const duration = 12 + ((index * 5) % 18);
    const delay = -((index * 3) % 17);

    const style: ParticleStyle = {
      '--arcane-delay': `${delay}s`,
      '--arcane-duration': `${duration}s`,
      '--arcane-left': `${left}%`,
      '--arcane-size': `${size}px`,
      '--arcane-top': `${top}%`,
    };

    return {
      id: index,
      style,
    };
  });
}

export function ArcaneAtmosphere() {
  const particles = useMemo(() => deterministicParticles(), []);
  const [mode, setMode] = useState<ArcaneVisualMode>(readArcaneVisualMode);
  const [announcement, setAnnouncement] = useState('');

  function changeMode(next: ArcaneVisualMode, announce = true) {
    setMode(next);
    applyArcaneVisualMode(next);

    if (announce) {
      setAnnouncement(`Efeitos visuais: ${arcaneVisualModeLabel(next)}`);
    }
  }

  useEffect(() => {
    applyArcaneVisualMode(mode, false);
  }, [mode]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLocaleLowerCase('en-US') === 'e'
      ) {
        event.preventDefault();
        changeMode(getNextArcaneVisualMode(mode));
      }
    }

    function handleExternalChange(event: Event) {
      const detail = (
        event as CustomEvent<{
          mode?: unknown;
        }>
      ).detail;
      const next = detail?.mode;

      if (isArcaneVisualMode(next)) {
        changeMode(next);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    window.addEventListener('crypt:set-arcane-effects', handleExternalChange);

    return () => {
      window.removeEventListener('keydown', handleShortcut);
      window.removeEventListener('crypt:set-arcane-effects', handleExternalChange);
    };
  }, [mode]);

  useEffect(() => {
    if (!announcement) return;

    const timeout = window.setTimeout(() => setAnnouncement(''), 1800);

    return () => window.clearTimeout(timeout);
  }, [announcement]);

  return (
    <>
      <div aria-hidden="true" className="arcane-atmosphere">
        <span className="arcane-atmosphere__noise" />
        <span className="arcane-atmosphere__constellations" />
        <span className="arcane-atmosphere__aurora arcane-atmosphere__aurora--violet" />
        <span className="arcane-atmosphere__aurora arcane-atmosphere__aurora--blue" />
        <span className="arcane-atmosphere__sigil arcane-atmosphere__sigil--one" />
        <span className="arcane-atmosphere__sigil arcane-atmosphere__sigil--two" />

        <span className="arcane-atmosphere__particles">
          {particles.map(({ id, style }) => (
            <i key={id} style={style} />
          ))}
        </span>
      </div>

      {announcement ? (
        <div aria-live="polite" className="arcane-effects-announcement" role="status">
          <Sparkles aria-hidden="true" size={14} />
          {announcement}
        </div>
      ) : null}
    </>
  );
}
