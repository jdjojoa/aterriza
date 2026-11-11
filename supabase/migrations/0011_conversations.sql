-- =============================================================================
-- Aterriza · 0011_conversations.sql
-- Several chatbot conversations per user.
-- Paste into the Supabase SQL Editor AFTER 0001–0010.
--
-- 1. conversations table (RLS: each user only sees and changes their own).
-- 2. chat_messages.conversation_id. Existing messages of each user move to one
--    conversation titled "Chat anterior".
-- 3. Inserting a message bumps conversations.updated_at (list order).
-- The daily chat limit is unchanged: ai_usage counts per user.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. conversations
-- -----------------------------------------------------------------------------
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null default 'Nuevo chat'
             check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_idx on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

create policy conversations_select_own on public.conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy conversations_insert_own on public.conversations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy conversations_update_own on public.conversations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy conversations_delete_own on public.conversations
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. chat_messages.conversation_id + backfill
-- -----------------------------------------------------------------------------
alter table public.chat_messages
  add column conversation_id uuid references public.conversations (id) on delete cascade;

insert into public.conversations (user_id, title, created_at, updated_at)
select user_id, 'Chat anterior', min(created_at), max(created_at)
from public.chat_messages
group by user_id;

update public.chat_messages m
set conversation_id = c.id
from public.conversations c
where c.user_id = m.user_id
  and c.title = 'Chat anterior'
  and m.conversation_id is null;

alter table public.chat_messages alter column conversation_id set not null;

create index chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at desc);

-- A message can only go into one of your own conversations.
drop policy chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own on public.chat_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 3. New message → conversation goes to the top of the list.
-- Runs as the caller, so conversations_update_own applies.
-- -----------------------------------------------------------------------------
create or replace function public.touch_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return null;
end;
$$;

create trigger touch_conversation
  after insert on public.chat_messages
  for each row execute function public.touch_conversation();

commit;
