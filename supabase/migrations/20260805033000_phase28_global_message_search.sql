set lock_timeout = '5s';
set statement_timeout = '90s';

create index if not exists channel_messages_search_fts_idx
on public.channel_messages
using gin (
  to_tsvector(
    'simple'::regconfig,
    coalesce(content, '')
  )
)
where deleted_at is null;

create index if not exists direct_messages_search_fts_idx
on public.direct_messages
using gin (
  to_tsvector(
    'simple'::regconfig,
    coalesce(content, '')
  )
)
where deleted_at is null;

drop function if exists public.search_my_message_history(
  text,
  text,
  uuid,
  text,
  integer,
  integer
);

create function public.search_my_message_history(
  search_text text,
  search_scope text default 'all',
  target_server_id uuid default null,
  search_order text default 'relevance',
  result_limit integer default 30,
  result_offset integer default 0
)
returns table (
  result_kind text,
  message_id uuid,
  server_id uuid,
  channel_id uuid,
  conversation_id uuid,
  place_name text,
  secondary_place_name text,
  author_id uuid,
  author_display_name text,
  author_handle text,
  author_avatar_path text,
  message_content text,
  attachment_name text,
  attachment_count bigint,
  created_at timestamptz,
  relevance real
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text :=
    btrim(coalesce(search_text, ''));
  text_query tsquery;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if char_length(normalized_query) not between 2 and 100
    or normalized_query ~ '[[:cntrl:]]'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_global_search_query';
  end if;

  if search_scope not in (
    'all',
    'servers',
    'direct'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_global_search_scope';
  end if;

  if search_order not in (
    'relevance',
    'recent'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_global_search_order';
  end if;

  if result_limit not between 1 and 50
    or result_offset not between 0 and 500
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_global_search_page';
  end if;

  text_query :=
    websearch_to_tsquery(
      'simple'::regconfig,
      normalized_query
    );

  return query
  with server_results as (
    select
      'server'::text as result_kind,
      messages.id as message_id,
      messages.server_id,
      messages.channel_id,
      null::uuid as conversation_id,
      servers.name as place_name,
      '#' || channels.name as secondary_place_name,
      messages.author_id,
      coalesce(
        authors.display_name,
        'Conta removida'
      ) as author_display_name,
      coalesce(
        authors.handle,
        'conta_removida'
      ) as author_handle,
      authors.avatar_path as author_avatar_path,
      messages.content as message_content,
      attachments.first_attachment_name
        as attachment_name,
      attachments.attachment_count,
      messages.created_at,
      (
        ts_rank_cd(
          to_tsvector(
            'simple'::regconfig,
            coalesce(messages.content, '')
          ),
          text_query
        )
        + case
            when position(
              lower(normalized_query)
              in lower(
                coalesce(messages.content, '')
              )
            ) > 0
            then 1
            else 0
          end
        + case
            when attachments.attachment_matches
            then 0.35
            else 0
          end
      )::real as relevance
    from public.channel_messages as messages
    inner join public.server_channels as channels
      on channels.id = messages.channel_id
    inner join public.servers
      on servers.id = messages.server_id
    left join public.profiles as authors
      on authors.id = messages.author_id
    left join lateral (
      select
        count(*)::bigint as attachment_count,
        min(items.original_name)
          as first_attachment_name,
        coalesce(
          bool_or(
            position(
              lower(normalized_query)
              in lower(items.original_name)
            ) > 0
          ),
          false
        ) as attachment_matches
      from public.message_attachments as items
      where items.message_id = messages.id
    ) as attachments on true
    where search_scope in ('all', 'servers')
      and messages.deleted_at is null
      and (
        target_server_id is null
        or messages.server_id = target_server_id
      )
      and public.can_view_channel(
        messages.channel_id,
        auth.uid()
      )
      and (
        (
          messages.content is not null
          and (
            to_tsvector(
              'simple'::regconfig,
              messages.content
            ) @@ text_query
            or position(
              lower(normalized_query)
              in lower(messages.content)
            ) > 0
          )
        )
        or attachments.attachment_matches
      )
  ),
  direct_results as (
    select
      'direct'::text as result_kind,
      messages.id as message_id,
      null::uuid as server_id,
      null::uuid as channel_id,
      messages.conversation_id,
      case
        when conversations.conversation_type = 'group'
        then conversations.title
        else coalesce(
          other_profile.display_name,
          'Conversa privada'
        )
      end as place_name,
      case
        when conversations.conversation_type = 'group'
        then 'Grupo privado'
        else 'Mensagem privada'
      end as secondary_place_name,
      messages.author_id,
      coalesce(
        authors.display_name,
        'Conta removida'
      ) as author_display_name,
      coalesce(
        authors.handle,
        'conta_removida'
      ) as author_handle,
      authors.avatar_path as author_avatar_path,
      messages.content as message_content,
      attachments.first_attachment_name
        as attachment_name,
      attachments.attachment_count,
      messages.created_at,
      (
        ts_rank_cd(
          to_tsvector(
            'simple'::regconfig,
            coalesce(messages.content, '')
          ),
          text_query
        )
        + case
            when position(
              lower(normalized_query)
              in lower(
                coalesce(messages.content, '')
              )
            ) > 0
            then 1
            else 0
          end
        + case
            when attachments.attachment_matches
            then 0.35
            else 0
          end
      )::real as relevance
    from public.direct_messages as messages
    inner join public.direct_conversations
      as conversations
      on conversations.id =
        messages.conversation_id
    inner join public.direct_conversation_participants
      as mine
      on mine.conversation_id =
        conversations.id
      and mine.profile_id = auth.uid()
      and mine.hidden_at is null
    left join lateral (
      select participants.profile_id
      from public.direct_conversation_participants
        as participants
      where participants.conversation_id =
          conversations.id
        and participants.profile_id <>
          auth.uid()
        and conversations.conversation_type =
          'direct'
      order by participants.joined_at
      limit 1
    ) as other_participant on true
    left join public.profiles as other_profile
      on other_profile.id =
        other_participant.profile_id
    left join public.profiles as authors
      on authors.id = messages.author_id
    left join lateral (
      select
        count(*)::bigint as attachment_count,
        min(items.original_name)
          as first_attachment_name,
        coalesce(
          bool_or(
            position(
              lower(normalized_query)
              in lower(items.original_name)
            ) > 0
          ),
          false
        ) as attachment_matches
      from public.direct_message_attachments
        as items
      where items.message_id = messages.id
    ) as attachments on true
    where search_scope in ('all', 'direct')
      and messages.deleted_at is null
      and (
        (
          messages.content is not null
          and (
            to_tsvector(
              'simple'::regconfig,
              messages.content
            ) @@ text_query
            or position(
              lower(normalized_query)
              in lower(messages.content)
            ) > 0
          )
        )
        or attachments.attachment_matches
      )
  ),
  combined as (
    select * from server_results
    union all
    select * from direct_results
  )
  select
    combined.result_kind,
    combined.message_id,
    combined.server_id,
    combined.channel_id,
    combined.conversation_id,
    combined.place_name,
    combined.secondary_place_name,
    combined.author_id,
    combined.author_display_name,
    combined.author_handle,
    combined.author_avatar_path,
    combined.message_content,
    combined.attachment_name,
    combined.attachment_count,
    combined.created_at,
    combined.relevance
  from combined
  order by
    case
      when search_order = 'relevance'
      then combined.relevance
      else null
    end desc nulls last,
    combined.created_at desc,
    combined.message_id desc
  limit result_limit
  offset result_offset;
end;
$$;

revoke all on function public.search_my_message_history(
  text,
  text,
  uuid,
  text,
  integer,
  integer
) from public, anon;

grant execute on function public.search_my_message_history(
  text,
  text,
  uuid,
  text,
  integer,
  integer
) to authenticated;

comment on function public.search_my_message_history(
  text,
  text,
  uuid,
  text,
  integer,
  integer
) is
  'Pesquisa mensagens e nomes de anexos somente em canais visíveis e conversas privadas ativas da pessoa autenticada.';
