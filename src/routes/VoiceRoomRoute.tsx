import { Headphones, LogIn, Radio, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { rememberServerChannel } from '../features/servers/serverNavigation';
import { VoiceStage } from '../features/voice/VoiceStage';
import { useVoiceCall } from '../features/voice/useVoiceCall';

export function VoiceRoomRoute() {
  const { channelId = '', serverId = '' } = useParams();
  const {
    channelId: activeChannelId,
    connection,
    error,
    isConnecting,
    join,
    setExpanded,
  } = useVoiceCall();
  const isThisCall = Boolean(connection && activeChannelId === channelId);

  useEffect(() => {
    if (serverId && channelId) {
      rememberServerChannel(serverId, channelId);
    }
  }, [channelId, serverId]);

  useEffect(() => {
    if (isThisCall) setExpanded(true);
  }, [isThisCall, setExpanded]);

  if (isThisCall) return <VoiceStage />;

  return (
    <main className="voice-lobby">
      <section>
        <span className="voice-lobby__icon">
          <Headphones aria-hidden="true" />
        </span>
        <p className="voice-lobby__eyebrow">
          <Radio size={14} /> Canal de voz
        </p>
        <h1>{connection ? 'Trocar de canal?' : 'Pronto para conversar?'}</h1>
        <p>
          {connection
            ? 'Você já está em outra chamada. Ao entrar aqui, o Crypt troca de sala sem precisar atualizar a página.'
            : 'Entre com um clique. A chamada continuará conectada enquanto você navega pelos chats e configurações.'}
        </p>
        <div className="voice-lobby__privacy">
          <ShieldCheck size={16} />
          Microfone protegido por permissão do navegador e token temporário.
        </div>
        {error ? <p className="voice-lobby__error">{error}</p> : null}
        <div className="voice-lobby__actions">
          <Link to={`/app/servidores/${serverId}`}>
            <Button variant="secondary">Voltar ao servidor</Button>
          </Link>
          <Button
            leadingIcon={<LogIn size={17} />}
            loading={isConnecting}
            onClick={() => void join(channelId)}
          >
            {connection ? 'Trocar e entrar' : 'Entrar na chamada'}
          </Button>
        </div>
      </section>
    </main>
  );
}
