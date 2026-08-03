import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Gem, HardDriveUpload, Radio, Sparkles, Trash2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { useArcanaMembership } from '../features/arcana/arcana.queries';
import {
  applyArcanaRune,
  fetchMyArcanaRunes,
  removeArcanaRune,
} from '../features/arcana/arcana.service';
import { arcanaTiers } from '../features/arcana/arcana.types';
import { useAuth } from '../features/auth/useAuth';
import { useMyServers } from '../features/servers/servers.queries';
const benefits = [
  {
    icon: Radio,
    title: 'Transmissão Windows HD a 60 FPS',
    text: 'Mais fluidez ao compartilhar jogos no aplicativo Windows.',
  },
  { icon: HardDriveUpload, title: 'Arquivos maiores', text: 'Envios de até 25 MB.' },
  { icon: Zap, title: '3 Runas de Comunidade', text: 'Fortaleça até três servidores.' },
  { icon: Sparkles, title: 'Identidade avançada', text: 'GIF, efeitos e gradiente exclusivo.' },
] as const;
export function ArcanaRoute() {
  const membership = useArcanaMembership();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const servers = useMyServers();
  const runesKey = ['arcana', 'runes', user?.id] as const;
  const runes = useQuery({
    enabled: Boolean(user),
    queryFn: () => fetchMyArcanaRunes(user!.id),
    queryKey: runesKey,
  });
  const applyRune = useMutation({
    mutationFn: ({ serverId, slot }: { serverId: string; slot: number }) =>
      applyArcanaRune(serverId, slot),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: runesKey }),
  });
  const clearRune = useMutation({
    mutationFn: removeArcanaRune,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: runesKey }),
  });
  if (membership.isPending)
    return (
      <div className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  const active = membership.data?.is_active === true;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-[#0d1020] p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.28),transparent_38%)]" />
        <div className="relative">
          <p className="eyebrow flex items-center gap-2">
            <Gem size={15} /> Arcana
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">Seu Crypt, elevado.</h1>
          <p className="mt-4 max-w-2xl text-sm text-crypt-muted">
            R$ 5 por mês com identidade avançada, transmissão aprimorada e Runas.
          </p>
          {active ? (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-emerald-400/10 px-4 py-3">
              <BadgeCheck className="text-emerald-300" />
              <strong className="text-white">Arcana {membership.data?.tier_name}</strong>
            </div>
          ) : (
            <div className="mt-6">
              <Button disabled>Assinar por R$ 5/mês</Button>
              <p className="mt-2 text-xs text-amber-200">
                A compra será liberada após configurar o provedor de pagamentos.
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {benefits.map(({ icon: Icon, title, text }) => (
          <article className="panel p-5" key={title}>
            <Icon className="text-violet-300" />
            <h2 className="mt-4 font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm text-crypt-muted">{text}</p>
          </article>
        ))}
      </section>
      <section className="panel mt-6 p-5">
        <h2 className="text-xl font-bold text-white">Jornada Arcana</h2>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {arcanaTiers.map(([name, color], index) => (
            <div className="rounded-xl bg-white/[0.025] p-3" key={name}>
              <span className="block size-2 rounded-full" style={{ backgroundColor: color }} />
              <strong className="mt-2 block text-xs text-white">
                {index + 1}. {name}
              </strong>
            </div>
          ))}
        </div>
      </section>
      {active ? (
        <section className="panel mt-6 p-5">
          <h2 className="text-xl font-bold text-white">Runas de Comunidade</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((slot) => {
              const rune = runes.data?.find((item) => item.rune_slot === slot);
              return (
                <div className="rounded-2xl bg-white/[0.025] p-4" key={slot}>
                  <p className="text-xs font-bold text-violet-300">Runa {slot}</p>
                  <select
                    className="mt-3 min-h-10 w-full rounded-xl bg-[#111522] text-white"
                    onChange={(e) => {
                      if (e.target.value) applyRune.mutate({ serverId: e.target.value, slot });
                    }}
                    value={rune?.server_id ?? ''}
                  >
                    <option value="">Escolher servidor</option>
                    {servers.data?.map((server) => (
                      <option key={server.server_id} value={server.server_id}>
                        {server.server_name}
                      </option>
                    ))}
                  </select>
                  {rune ? (
                    <Button
                      className="mt-3"
                      leadingIcon={<Trash2 size={13} />}
                      onClick={() => clearRune.mutate(slot)}
                      size="sm"
                      variant="ghost"
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <p className="mt-5 text-center text-xs text-crypt-subtle">
        Personalize em{' '}
        <Link className="text-violet-300" to="/app/perfil/editar">
          Editar perfil
        </Link>
        .
      </p>
    </main>
  );
}
