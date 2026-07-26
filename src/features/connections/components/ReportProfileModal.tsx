import { Flag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Textarea } from '../../../components/common/Textarea';
import { reportProfileSchema, type ReportProfileValues } from '../connections.schemas';

type ReportProfileModalProps = {
  displayName: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ReportProfileValues) => void;
  open: boolean;
};

const reasons: Array<{
  label: string;
  value: ReportProfileValues['reason'];
}> = [
  { label: 'Spam ou comportamento repetitivo', value: 'spam' },
  { label: 'Assédio ou intimidação', value: 'harassment' },
  { label: 'Perfil falso ou personificação', value: 'fake_profile' },
  { label: 'Conteúdo impróprio', value: 'inappropriate_content' },
  { label: 'Outro motivo', value: 'other' },
];

export function ReportProfileModal({
  displayName,
  loading,
  onOpenChange,
  onSubmit,
  open,
}: ReportProfileModalProps) {
  const [reason, setReason] = useState<ReportProfileValues['reason']>('spam');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string>();

  function close(openState: boolean) {
    if (!openState) {
      setReason('spam');
      setDetails('');
      setError(undefined);
    }
    onOpenChange(openState);
  }

  function submit() {
    const result = reportProfileSchema.safeParse({ details, reason });

    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }

    setError(undefined);
    onSubmit(result.data);
  }

  return (
    <Modal
      description="A outra pessoa não será avisada. Não inclua senhas, e-mail ou outros dados sensíveis."
      footer={
        <>
          <Button onClick={() => close(false)} variant="ghost">
            Cancelar
          </Button>
          <Button
            leadingIcon={<Flag aria-hidden="true" size={16} />}
            loading={loading}
            onClick={submit}
            variant="secondary"
          >
            Enviar denúncia
          </Button>
        </>
      }
      onOpenChange={close}
      open={open}
      title={`Denunciar ${displayName}`}
    >
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-crypt-text">
          Motivo
          <select
            className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated/70 px-3.5 text-sm text-white outline-none transition focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
            onChange={(event) => {
              setReason(event.target.value as ReportProfileValues['reason']);
              setError(undefined);
            }}
            value={reason}
          >
            {reasons.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <Textarea
          errorText={error}
          helperText={`${details.length}/500 — opcional.`}
          label="Detalhes"
          onChange={(event) => {
            setDetails(event.target.value);
            setError(undefined);
          }}
          placeholder="Explique de forma objetiva o que aconteceu."
          value={details}
        />
      </div>
    </Modal>
  );
}
