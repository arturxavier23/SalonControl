-- ============================================================
-- SalonControl — Setup do banco (Supabase / PostgreSQL)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Cria as tabelas, a função usuario_eh_admin() e as policies de RLS.
-- ============================================================

-- ---------- TABELAS ----------

-- Perfis: liga um usuário do Supabase Auth a um papel (admin/user)
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  role text not null default 'user',
  criado_em timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  observacao text,
  criado_em timestamptz not null default now()
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco numeric(10, 2) not null default 0,
  duracao_minutos integer not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  percentual_comissao numeric(5, 2) not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  servico_id uuid references public.servicos (id) on delete set null,
  profissional_id uuid references public.profissionais (id) on delete set null,
  data date not null,
  hora_inicio time not null,
  hora_fim time,
  status text not null default 'agendado',
  observacao text,
  criado_em timestamptz not null default now()
);

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid references public.agendamentos (id) on delete set null,
  cliente_id uuid references public.clientes (id) on delete set null,
  profissional_id uuid references public.profissionais (id) on delete set null,
  servico_id uuid references public.servicos (id) on delete set null,
  valor_total numeric(10, 2) not null default 0,
  status text not null default 'pago',
  criado_em timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references public.vendas (id) on delete cascade,
  forma_pagamento text not null,
  valor numeric(10, 2) not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  tipo text not null default 'uso_interno',
  quantidade integer not null default 0,
  estoque_minimo integer not null default 0,
  custo_unitario numeric(10, 2) not null default 0,
  preco_venda numeric(10, 2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references public.produtos (id) on delete cascade,
  tipo text not null,
  quantidade integer not null default 0,
  observacao text,
  criado_em timestamptz not null default now()
);

-- Fechamento diário do caixa (uma linha por data fechada)
create table if not exists public.fechamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  total numeric(10, 2) not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------- FUNÇÃO DE PERMISSÃO ----------
-- security definer: consulta perfis ignorando RLS, evitando recursão nas policies.
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

-- ---------- ATIVA RLS ----------
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

-- ---------- POLICIES ----------

-- perfis: cada usuário lê o próprio perfil; admin enxerga/gerencia todos.
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.usuario_eh_admin());

drop policy if exists perfis_admin_all on public.perfis;
create policy perfis_admin_all on public.perfis
  for all to authenticated
  using (public.usuario_eh_admin())
  with check (public.usuario_eh_admin());

-- Demais tabelas: usuário logado pode ler, inserir e editar.
-- DELETE fica restrito a admin (via usuario_eh_admin()).
do $$
declare
  t text;
  tabelas text[] := array[
    'clientes', 'servicos', 'profissionais', 'agendamentos',
    'vendas', 'pagamentos', 'produtos', 'movimentacoes_estoque'
  ];
begin
  foreach t in array tabelas loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format('drop policy if exists %I_delete on public.%I;', t, t);

    execute format(
      'create policy %I_select on public.%I for select to authenticated using (true);',
      t, t);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (true);',
      t, t);
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (true) with check (true);',
      t, t);
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (public.usuario_eh_admin());',
      t, t);
  end loop;
end $$;

-- fechamentos_caixa: todos leem; apenas admin fecha (insert) e reabre (delete).
drop policy if exists fechamentos_select on public.fechamentos_caixa;
create policy fechamentos_select on public.fechamentos_caixa
  for select to authenticated using (true);

drop policy if exists fechamentos_insert on public.fechamentos_caixa;
create policy fechamentos_insert on public.fechamentos_caixa
  for insert to authenticated with check (public.usuario_eh_admin());

drop policy if exists fechamentos_delete on public.fechamentos_caixa;
create policy fechamentos_delete on public.fechamentos_caixa
  for delete to authenticated using (public.usuario_eh_admin());

-- ============================================================
-- DEPOIS DE RODAR ISTO:
-- 1) Crie um usuário em Authentication > Users > Add user.
-- 2) Copie o User UID desse usuário.
-- 3) Rode o insert abaixo trocando o UUID (deixa você como admin):
--
-- insert into public.perfis (id, nome, role)
-- values ('COLE_O_UUID_AQUI', 'Artur', 'admin');
-- ============================================================
