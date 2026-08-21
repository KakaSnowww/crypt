import {
  Activity,
  Braces,
  Check,
  CircleDot,
  Code2,
  Cpu,
  Radio,
  ShieldCheck,
  Terminal,
  Wifi,
} from 'lucide-react';
import { useEffect, type PointerEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthExperience } from '../../features/auth/components/useAuthExperience';
import { AuthExperienceProvider } from '../../features/auth/components/AuthExperienceProvider';
import { Brand } from './Brand';

const routeInformation = {
  callback: { command: 'validating external handshake', node: 'AUTH_CALLBACK', step: '05' },
  login: { command: 'waiting for known identity', node: 'IDENTITY_GATE', step: '01' },
  recovery: { command: 'requesting recovery channel', node: 'RECOVERY_NODE', step: '03' },
  register: { command: 'registering new identity', node: 'CREATE_GATE', step: '02' },
  reset: { command: 'authorizing credential update', node: 'PASSWORD_NODE', step: '04' },
} as const;

type AuthMode = keyof typeof routeInformation;

function getAuthMode(pathname: string): AuthMode {
  if (pathname === '/cadastro') return 'register';
  if (pathname === '/recuperar-senha') return 'recovery';
  if (pathname === '/redefinir-senha') return 'reset';
  if (pathname === '/auth/callback') return 'callback';
  return 'login';
}

export function AuthLayout() {
  return (
    <AuthExperienceProvider>
      <AuthEnvironment />
    </AuthExperienceProvider>
  );
}

function AuthEnvironment() {
  const location = useLocation();
  const { phase, setPhase } = useAuthExperience();
  const mode = getAuthMode(location.pathname);
  const information = routeInformation[mode];

  useEffect(() => setPhase('idle'), [location.pathname, setPhase]);

  function trackAtmosphere(event: PointerEvent<HTMLElement>) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--auth-parallax-x', `${horizontal * 8}px`);
    event.currentTarget.style.setProperty('--auth-parallax-y', `${vertical * 6}px`);
    event.currentTarget.style.setProperty('--auth-pointer-x', `${event.clientX}px`);
    event.currentTarget.style.setProperty('--auth-pointer-y', `${event.clientY}px`);
  }

  return (
    <main
      className="auth-gateway"
      data-auth-mode={mode}
      data-auth-phase={phase}
      onPointerMove={trackAtmosphere}
    >
      <div aria-hidden="true" className="auth-gateway__atmosphere">
        <span className="auth-gateway__wash auth-gateway__wash--violet" />
        <span className="auth-gateway__wash auth-gateway__wash--cyan" />
        <span className="auth-gateway__grid" />
        <span className="auth-gateway__grain" />
        <span className="auth-gateway__cursor-light" />
        <div className="auth-gateway__particles">
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>

      <header className="auth-gateway__topbar">
        <Brand subtitle="Private Community Network" />
        <div className="auth-gateway__topology" aria-hidden="true">
          <span>SAO-01</span>
          <i />
          <span>AUTH GATEWAY</span>
          <i />
          <span>{information.step}</span>
        </div>
        <div className="auth-gateway__network-state">
          <span />
          <div>
            <strong>CRYPT NETWORK</strong>
            <small>SYSTEM ONLINE</small>
          </div>
        </div>
      </header>

      <div className="auth-gateway__composition">
        <section className="auth-gateway__universe" aria-labelledby="crypt-auth-manifesto">
          <div className="auth-gateway__coordinate" aria-hidden="true">
            <span>NODE 01</span>
            <i />
            <span>23.5505° S</span>
          </div>

          <div className="auth-gateway__manifesto">
            <p>
              <Code2 aria-hidden="true" size={14} /> CRYPT://PRIVATE_NETWORK
            </p>
            <h1 id="crypt-auth-manifesto">
              <span>Seu espaço.</span>
              <span>Seu código.</span>
              <span>
                Sua <em>conexão.</em>
              </span>
            </h1>
            <p className="auth-gateway__manifesto-copy">
              Uma rede privada para jogar, construir e permanecer conectado às pessoas que fazem
              parte do seu universo.
            </p>
          </div>

          <div className="auth-terminal" aria-label="Estado da rede">
            <header>
              <span>
                <Terminal aria-hidden="true" size={13} /> crypt@network:~
              </span>
              <span>
                <Activity aria-hidden="true" size={12} /> LIVE
              </span>
            </header>
            <div className="auth-terminal__body">
              <p className="auth-terminal__command">
                <b>$</b> establishing secure session...
              </p>
              <div className="auth-terminal__checks">
                <p>
                  <span>gateway</span>
                  <i />
                  <strong>connected</strong>
                </p>
                <p>
                  <span>voice</span>
                  <i />
                  <strong>ready</strong>
                </p>
                <p>
                  <span>encryption</span>
                  <i />
                  <strong>enabled</strong>
                </p>
                <p>
                  <span>latency</span>
                  <i />
                  <strong>18ms</strong>
                </p>
              </div>
              <p className="auth-terminal__response">
                <span>&gt;</span> {information.command}
                <i />
              </p>
            </div>
          </div>

          <div className="auth-gateway__signals" aria-hidden="true">
            <span>
              <Radio size={13} /> RTC ACTIVE
            </span>
            <span>
              <Wifi size={13} /> VOICE READY
            </span>
            <span>
              <Cpu size={13} /> 18 MS
            </span>
          </div>
        </section>

        <AuthConnection mode={mode} phase={phase} />

        <section
          aria-label="Área de acesso"
          className="auth-portal"
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget) && phase === 'focused')
              setPhase('idle');
          }}
          onFocusCapture={() => {
            if (phase === 'idle' || phase === 'error') setPhase('focused');
          }}
        >
          <span aria-hidden="true" className="auth-portal__halo" />
          <span aria-hidden="true" className="auth-portal__edge auth-portal__edge--top" />
          <span aria-hidden="true" className="auth-portal__edge auth-portal__edge--right" />
          <span aria-hidden="true" className="auth-portal__edge auth-portal__edge--bottom" />
          <span aria-hidden="true" className="auth-portal__edge auth-portal__edge--left" />
          <span aria-hidden="true" className="auth-portal__corner auth-portal__corner--tl" />
          <span aria-hidden="true" className="auth-portal__corner auth-portal__corner--tr" />
          <span aria-hidden="true" className="auth-portal__corner auth-portal__corner--bl" />
          <span aria-hidden="true" className="auth-portal__corner auth-portal__corner--br" />

          <header className="auth-portal__header">
            <div>
              <CircleDot aria-hidden="true" size={13} />
              <span>{information.node}</span>
            </div>
            <span className="auth-portal__phase">
              {phase === 'verified' ? <Check size={12} /> : <Braces size={12} />}
              {phase === 'loading'
                ? 'PROCESSING'
                : phase === 'verified'
                  ? 'VERIFIED'
                  : phase === 'error'
                    ? 'REJECTED'
                    : 'SECURE'}
            </span>
          </header>

          <div className="auth-portal__viewport" key={location.pathname}>
            <Outlet />
          </div>

          <footer className="auth-portal__footer">
            <span>
              <ShieldCheck aria-hidden="true" size={12} /> END-TO-END ENCRYPTED
            </span>
            <span>NODE // {information.step}</span>
          </footer>
        </section>
      </div>

      <footer className="auth-gateway__footer">
        <span>CRYPT 0.12.0</span>
        <span>WINDOWS · ANDROID · WEB</span>
        <span>PRIVATE NETWORK / BUILD 120</span>
      </footer>
    </main>
  );
}

function AuthConnection({ mode, phase }: { mode: AuthMode; phase: string }) {
  return (
    <div aria-hidden="true" className="auth-connection">
      <svg preserveAspectRatio="none" viewBox="0 0 320 600">
        <path
          className="auth-connection__ghost"
          d="M0 420 C80 420 48 184 154 184 S232 286 320 286"
        />
        <path
          className="auth-connection__path"
          d="M0 420 C80 420 48 184 154 184 S232 286 320 286"
        />
      </svg>
      <span className="auth-connection__origin">
        <Code2 size={14} />
      </span>
      <span className="auth-connection__node auth-connection__node--one" />
      <span className="auth-connection__node auth-connection__node--two" />
      <span className="auth-connection__target">
        <ShieldCheck size={14} />
      </span>
      <span className="auth-connection__packet auth-connection__packet--a" />
      <span className="auth-connection__packet auth-connection__packet--b" />
      <div className="auth-connection__readout">
        <span>{mode.toUpperCase()}</span>
        <strong>{phase.toUpperCase()}</strong>
      </div>
    </div>
  );
}
