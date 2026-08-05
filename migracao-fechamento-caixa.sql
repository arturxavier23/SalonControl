-- ============================================================
-- SalonControl — Migração: Fechamento de Caixa
-- Rode isto UMA VEZ no SQL Editor do Supabase se você JÁ tem o banco.
-- Ele só adiciona a tabela fechamentos_caixa e suas policies.
-- Não altera nenhuma outra tabela nem seus dados.
-- ============================================================

-- Garante que a função de admin existe (idempotente).
create or replace function public.usuario_eh_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Tabela de fechamento diário (uma linha por data fechada).
create table if not exists public.fechamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  total numeric(10, 2) not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.fechamentos_caixa enable row level security;

-- Todos os usuários logados podem consultar se um dia está fechado.
drop policy if exists fechamentos_select on public.fechamentos_caixa;
create policy fechamentos_select on public.fechamentos_caixa
  for select to authenticated using (true);

-- Apenas admin fecha o caixa (insert).
drop policy if exists fechamentos_insert on public.fechamentos_caixa;
create policy fechamentos_insert on public.fechamentos_caixa
  for insert to authenticated with check (public.usuario_eh_admin());

-- Apenas admin reabre o caixa (delete).
drop policy if exists fechamentos_delete on public.fechamentos_caixa;
create policy fechamentos_delete on public.fechamentos_caixa
  for delete to authenticated using (public.usuario_eh_admin());
