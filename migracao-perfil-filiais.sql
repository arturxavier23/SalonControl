-- ============================================================
-- SalonControl — Perfil (foto), Logo do salão e Filiais
-- Rode no SQL Editor do Supabase (depois das migrações anteriores).
-- Adiciona: foto no perfil, logo no salão, múltiplos salões por usuário
-- (filiais) com troca de filial, e o bucket de imagens (Storage).
-- ============================================================

-- ---------- 1. Colunas novas ----------
alter table public.perfis add column if not exists avatar_url text;
alter table public.saloes add column if not exists logo_url text;

-- ---------- 2. Vínculo usuário <-> salão (várias filiais) ----------
create table if not exists public.membros_salao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  salao_id uuid not null references public.saloes (id) on delete cascade,
  role text not null default 'user',
  criado_em timestamptz not null default now(),
  unique (usuario_id, salao_id)
);

-- Backfill: cada perfil que já tem salão vira um vínculo.
insert into public.membros_salao (usuario_id, salao_id, role)
select id, salao_id, role
from public.perfis
where salao_id is not null
on conflict (usuario_id, salao_id) do nothing;

-- ---------- 3. Funções ----------
create or replace function public.salao_do_usuario()
returns uuid language sql security definer set search_path = public as $$
  select salao_id from public.perfis where id = auth.uid();
$$;

create or replace function public.usuario_eh_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and role = 'admin');
$$;

-- Lista os salões (filiais) do usuário, para o seletor.
create or replace function public.meus_saloes()
returns table (id uuid, nome text, role text)
language sql security definer set search_path = public as $$
  select s.id, s.nome, m.role
  from public.membros_salao m
  join public.saloes s on s.id = m.salao_id
  where m.usuario_id = auth.uid()
  order by s.nome;
$$;

-- Troca a filial ativa (só se o usuário for membro dela).
create or replace function public.trocar_salao(p_salao uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  select role into v_role
  from public.membros_salao
  where usuario_id = auth.uid() and salao_id = p_salao;

  if v_role is null then
    raise exception 'Você não pertence a este salão.';
  end if;

  update public.perfis
  set salao_id = p_salao, role = v_role
  where id = auth.uid();

  return p_salao;
end;
$$;

-- Cria uma nova filial e torna o usuário admin dela (e ativa).
create or replace function public.criar_filial(p_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_salao uuid;
begin
  insert into public.saloes (nome) values (p_nome) returning id into v_salao;

  insert into public.membros_salao (usuario_id, salao_id, role)
  values (auth.uid(), v_salao, 'admin')
  on conflict (usuario_id, salao_id) do update set role = 'admin';

  update public.perfis set salao_id = v_salao, role = 'admin' where id = auth.uid();

  return v_salao;
end;
$$;

-- Recria criar_salao e entrar_no_salao para também gravar o vínculo.
create or replace function public.criar_salao(p_nome text, p_nome_usuario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_salao uuid;
begin
  insert into public.saloes (nome) values (p_nome) returning id into v_salao;

  insert into public.perfis (id, nome, salao_id, role)
  values (auth.uid(), p_nome_usuario, v_salao, 'admin')
  on conflict (id) do update
    set salao_id = excluded.salao_id, role = 'admin', nome = excluded.nome;

  insert into public.membros_salao (usuario_id, salao_id, role)
  values (auth.uid(), v_salao, 'admin')
  on conflict (usuario_id, salao_id) do update set role = 'admin';

  return v_salao;
end;
$$;

create or replace function public.entrar_no_salao(p_codigo text, p_nome_usuario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_salao uuid;
begin
  select id into v_salao from public.saloes
  where codigo_convite = upper(trim(p_codigo));

  if v_salao is null then
    raise exception 'Código de convite inválido';
  end if;

  insert into public.perfis (id, nome, salao_id, role)
  values (auth.uid(), p_nome_usuario, v_salao, 'user')
  on conflict (id) do update
    set salao_id = excluded.salao_id, nome = excluded.nome;

  insert into public.membros_salao (usuario_id, salao_id, role)
  values (auth.uid(), v_salao, 'user')
  on conflict (usuario_id, salao_id) do nothing;

  return v_salao;
end;
$$;

grant execute on function public.meus_saloes() to authenticated;
grant execute on function public.trocar_salao(uuid) to authenticated;
grant execute on function public.criar_filial(text) to authenticated;
grant execute on function public.criar_salao(text, text) to authenticated;
grant execute on function public.entrar_no_salao(text, text) to authenticated;

-- ---------- 4. RLS ----------
alter table public.membros_salao enable row level security;

drop policy if exists membros_select on public.membros_salao;
create policy membros_select on public.membros_salao
  for select to authenticated
  using (usuario_id = auth.uid());

-- Admin pode editar o próprio salão (nome/logo).
drop policy if exists saloes_update on public.saloes;
create policy saloes_update on public.saloes
  for update to authenticated
  using (id = public.salao_do_usuario() and public.usuario_eh_admin())
  with check (id = public.salao_do_usuario() and public.usuario_eh_admin());

-- ---------- 5. Storage (bucket público de imagens) ----------
insert into storage.buckets (id, name, public)
values ('publico', 'publico', true)
on conflict (id) do nothing;

drop policy if exists publico_select on storage.objects;
create policy publico_select on storage.objects
  for select using (bucket_id = 'publico');

drop policy if exists publico_insert on storage.objects;
create policy publico_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'publico');

drop policy if exists publico_update on storage.objects;
create policy publico_update on storage.objects
  for update to authenticated using (bucket_id = 'publico');

-- ============================================================
-- PRONTO:
-- - Perfil tem foto (avatar_url); salão tem logo (logo_url).
-- - Um usuário pode pertencer a vários salões (membros_salao).
-- - Admin troca de filial e cria novas filiais no app.
-- - Imagens vão para o bucket público "publico".
-- ============================================================
