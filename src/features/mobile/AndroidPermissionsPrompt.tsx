import { Bell, Bluetooth, Camera, Check, Files, Mic, Settings, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { isAndroidRuntime } from '../../lib/platform';
import {
  getAndroidPermissions,
  openAndroidAppSettings,
  requestAndroidPermissions,
  type AndroidPermissionsStatus,
  type AndroidPermissionState,
} from '../voice/androidCall';
import { hasMissingPermissions } from './androidPermissions';

type PermissionItemProps = {
  description: string;
  icon: ReactNode;
  label: string;
  state?: AndroidPermissionState;
};

export function AndroidPermissionsPrompt() {
  const androidRuntime = isAndroidRuntime();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<AndroidPermissionsStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!androidRuntime) return;
    const nextStatus = await getAndroidPermissions();
    setStatus(nextStatus);
    if (hasMissingPermissions(nextStatus)) setOpen(true);
  }, [androidRuntime]);

  useEffect(() => {
    if (!androidRuntime) return;
    let active = true;

    void getAndroidPermissions()
      .then((nextStatus) => {
        if (!active) return;
        setStatus(nextStatus);
        setOpen(hasMissingPermissions(nextStatus));
      })
      .catch(() => undefined);

    const handleFocus = () => void refresh().catch(() => undefined);
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [androidRuntime, refresh]);

  if (!androidRuntime || !status) return null;

  const requestAccess = async () => {
    setBusy(true);
    setRequested(true);
    try {
      const nextStatus = await requestAndroidPermissions();
      setStatus(nextStatus);
      setOpen(hasMissingPermissions(nextStatus));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      description="Autorize somente os recursos usados por chamadas, câmera e avisos. Você continua no controle e pode alterar tudo nas configurações do Android."
      footer={
        <>
          {requested && hasMissingPermissions(status) ? (
            <Button
              leadingIcon={<Settings size={17} />}
              onClick={() => void openAndroidAppSettings()}
              variant="secondary"
            >
              Abrir configurações
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)} variant="ghost">
              Agora não
            </Button>
          )}
          <Button loading={busy} onClick={() => void requestAccess()}>
            {requested ? 'Tentar novamente' : 'Permitir recursos'}
          </Button>
        </>
      }
      onOpenChange={setOpen}
      open={open}
      title="Prepare o Crypt no Android"
    >
      <div className="grid gap-2.5">
        <PermissionItem
          description="Necessário para conversar nas chamadas."
          icon={<Mic size={18} />}
          label="Microfone"
          state={status.microphone}
        />
        <PermissionItem
          description="Usada somente quando você liga sua câmera."
          icon={<Camera size={18} />}
          label="Câmera"
          state={status.camera}
        />
        <PermissionItem
          description="Mantém avisos e a chamada visível em segundo plano."
          icon={<Bell size={18} />}
          label="Notificações"
          state={status.notifications}
        />
        <PermissionItem
          description="Permite encaminhar a chamada para fones e caixas pareadas."
          icon={<Bluetooth size={18} />}
          label="Dispositivos próximos"
          state={status.bluetooth}
        />
        <PermissionItem
          description="Fotos e documentos usam o seletor protegido do Android; acesso geral não é necessário."
          icon={<Files size={18} />}
          label="Fotos e arquivos"
          state="granted"
        />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-3 text-xs leading-5 text-emerald-100">
        <ShieldCheck className="mt-0.5 shrink-0" size={17} />O compartilhamento de tela continuará
        mostrando a confirmação oficial do Android sempre que uma nova transmissão começar.
      </div>
    </Modal>
  );
}

function PermissionItem({ description, icon, label, state }: PermissionItemProps) {
  const granted = state === 'granted';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm text-white">{label}</strong>
        <span className="mt-0.5 block text-xs leading-5 text-crypt-subtle">{description}</span>
      </span>
      <span
        className={
          granted
            ? 'flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold text-emerald-300'
            : 'shrink-0 text-[0.68rem] font-semibold text-amber-200'
        }
      >
        {granted ? <Check size={14} /> : null}
        {granted ? 'Permitido' : 'Pendente'}
      </span>
    </div>
  );
}
