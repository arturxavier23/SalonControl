-- ============================================================
-- SalonControl — CORREÇÃO DE RLS (isolamento por salão)
-- Remove TODAS as policies antigas de cada tabela e recria só as
-- corretas (isoladas por salão). Rode no SQL Editor do Supabase.
-- Necessário porque policies antigas permissivas anulavam o isolamento.
-- ============================================================

-- Garante as funções auxiliares (idempotente).
create or replace function public.usuario_eh_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and role = 'admin');
$$;

create or replace function public.salao_do_usuario()
returns uuid language sql security definer set search_path = public as $$
  select salao_id from public.perfis where id = auth.uid();
$$;

-- ---------- 1. Garante RLS ativo ----------
alter table public.saloes                enable row level security;
alter table public.perfis                enable row level security;
alter table public.clientes              enable row level security;
alter table public.servicos              enable row level security;
alter table public.profissionais         enable row level security;
alter table public.agendamentos          enable row level security;
alter table public.vendas                enable row level security;
alter table public.pagamentos            enable row level security;
alter table public.produtos              enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.fechamentos_caixa     enable row level security;

-- ---------- 2. Apaga TODAS as policies antigas ----------
do $$
declare
  pol record;
  t text;
  tabelas text[] := array[
    'saloes', 'perfis', 'clientes', 'servicos', 'profissionais',
    'agendamentos', 'vendas', 'pagamentos', 'produtos',
    'movimentacoes_estoque', 'fechamentos_caixa'
  ];
begin
  foreach t in array tabelas loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I;', pol.policyname, t);
    end loop;
  end loop;
end $$;

-- ---------- 3. Recria as policies corretas ----------

-- saloes: cada membro lê só o próprio salão.
create policy saloes_select on public.saloes
  for select to authenticated
  using (id = public.salao_do_usuario());

-- perfis: lê o próprio e os colegas do mesmo salão; cria/edita o próprio.
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or salao_id = public.salao_do_usuario());

create policy perfis_insert on public.perfis
  for insert to authenticated
  with check (id = auth.uid());

create policy perfis_update on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy perfis_admin_all on public.perfis
  for all to authenticated
  using (salao_id = public.salao_do_usuario() and public.usuario_eh_admin())
  with check (salao_id = public.salao_do_usuario() and public.usuario_eh_admin());

-- Tabelas de dados: tudo isolado por salão; DELETE só admin do salão.
do $$
declare
  t text;
  tabelas text[] := array[
    'clientes', 'servicos', 'profissionais', 'agendamentos',
    'vendas', 'pagamentos', 'produtos', 'movimentacoes_estoque',
    'fechamentos_caixa'
  ];
begin
  foreach t in array tabelas loop
    execute format(
      'create policy %I_select on public.%I for select to authenticated
       using (salao_id = public.salao_do_usuario());', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated
       with check (salao_id = public.salao_do_usuario());', t, t);
    execute format(
      'create policy %I_update on public.%I for update to authenticated
       using (salao_id = public.salao_do_usuario())
       with check (salao_id = public.salao_do_usuario());', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated
       using (salao_id = public.salao_do_usuario() and public.usuario_eh_admin());', t, t);
  end loop;
end $$;

-- ============================================================
-- CONFERIR DEPOIS (opcional): ver as policies de uma tabela.
-- select tablename, policyname, cmd, qual
-- from pg_policies where schemaname = 'public' and tablename = 'produtos';
-- ============================================================
