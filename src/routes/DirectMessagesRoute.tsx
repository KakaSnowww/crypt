import { MessageCircle, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { useFriends } from '../features/connections/connections.queries';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { useDirectConversations } from '../features/directMessages/directMessages.queries';
import { useDirectMessageActions } from '../features/directMessages/useDirectMessageActions';

export function DirectMessagesRoute() {
  const navigate = useNavigate();
  const conversationsQuery = useDirectConversations();
  const friendsQuery = useFriends();
  const actions = useDirectMessageActions();
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const conversations = useMemo(
    () =>
      (conversationsQuery.data ?? []).filter(
        (conversation) =>
          !normalizedSearch ||
          conversation.other_display_name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
          conversation.other_handle.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
      ),
    [conversationsQuery.data, normalizedSearch],
  );
  const friendsWithoutConversation = (friendsQuery.data ?? []).filter(
    (friend) =>
      !(conversationsQuery.data ?? []).some(
        (conversation) => conversation.other_profile_id === friend.profile_id,
      ),
  );

  async function startConversation(profileId: string) {
    const conversationId = await actions.open.mutateAsync(profileId).catch(() => null);
    if (conversationId) {
      void navigate(`/app/mensagens/${conversationId}`);
    }
  }

  if (conversationsQuery.isPending || friendsQuery.isPending) {
    return (
      <div aria-label="Carregando mensagens privadas" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
      <section className="panel overflow-hidden">
        <div className="border-b border-white/5 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
              <MessageCircle size={21} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-white">Mensagens privadas</h1>
              <p className="mt-1 text-sm text-crypt-muted">
                Conversas individuais protegidas por privacidade e bloqueios.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Input
              label="Filtrar conversas"
              leadingIcon={<Search size={17} />}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar conversas"
              value={search}
            />
          </div>
        </div>

        {conversations.length ? (
          <div className="divide-y divide-white/5">
            {conversations.map((conversation) => (
              <div
                className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.035] sm:px-6"
                key={conversation.conversation_id}
              >
                <Link
                  className="flex min-w-0 flex-1 items-center gap-3"
                  to={`/app/mensagens/${conversation.conversation_id}`}
                >
                  <span className="relative">
                    <ProfileAvatar
                      avatarPath={conversation.other_avatar_path}
                      displayName={conversation.other_display_name}
                      size="md"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-crypt-panel ${
                        conversation.is_online ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {conversation.other_display_name}
                      </span>
                      {conversation.is_blocked ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.65rem] text-red-200">
                          Bloqueada
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-crypt-subtle">
                      {conversation.last_message_preview}
                    </span>
                  </span>
                  {conversation.unread_count ? (
                    <span className="grid min-w-6 place-items-center rounded-full bg-violet-500 px-2 py-1 text-xs font-semibold text-white">
                      {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                    </span>
                  ) : null}
                </Link>
                <button
                  aria-label={`Fechar conversa com ${conversation.other_display_name}`}
                  className="grid size-9 place-items-center rounded-xl text-crypt-subtle opacity-0 hover:bg-white/[0.07] hover:text-white group-hover:opacity-100 focus:opacity-100"
                  onClick={() => actions.hide.mutate(conversation.conversation_id)}
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-crypt-muted">
              {search ? 'Nenhuma conversa corresponde à busca.' : 'Sua lista ainda está vazia.'}
            </p>
          </div>
        )}
      </section>

      {friendsWithoutConversation.length ? (
        <section className="mt-5 panel p-5 sm:p-7">
          <h2 className="font-semibold text-white">Começar conversa com um amigo</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {friendsWithoutConversation.map((friend) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3"
                key={friend.profile_id}
              >
                <ProfileAvatar
                  avatarPath={friend.avatar_path}
                  displayName={friend.display_name}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {friend.display_name}
                  </span>
                  <span className="block truncate text-xs text-crypt-subtle">@{friend.handle}</span>
                </span>
                <Button
                  loading={actions.open.isPending}
                  onClick={() => void startConversation(friend.profile_id)}
                  size="sm"
                  variant="secondary"
                >
                  Conversar
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
