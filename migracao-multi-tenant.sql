-- ============================================================
-- SalonControl — Migração MULTI-TENANT (vários salões)
-- Isola os dados por salão. Rode UMA VEZ no SQL Editor do Supabase.
-- Seguro para banco já existente: seus dados atuais são movidos
-- para um salão padrão automaticamente.
-- ============================================================

-- ---------- 1. Tabela de salões ----------
create table if not exists public.saloes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique default upper(substr(md5(random()::text), 1, 6)),
  criado_em timestamptz not null default now()
);

-- ---------- 2. Coluna salao_id em todas as tabelas ----------
alter table public.perfis                add column if not exists salao_id uuid references public.saloes (id) on delete set null;
alter table public.clientes              add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.servicos              add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.profissionais         add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.agendamentos          add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.vendas                add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.pagamentos            add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.produtos              add column if not exists salao_id uuid references public.saloes (id) on delete cascade;
alter table public.movimentacoes_estoque add column if not exists salao_id uuid references public.saloes (id) on delete cascade;

-- fechamentos_caixa: garante a tabela E as colunas (a tabela pode já existir
-- com outra estrutura, então adicionamos cada coluna se estiver faltando).
create table if not exists public.fechamentos_caixa (
  id uuid primary key default gen_random_uuid()
);
alter table public.fechamentos_caixa add column if not exists data date;
alter table public.fechamentos_caixa add column if not exists total numeric(10, 2) not null default 0;
alter table public.fechamentos_caixa add column if not exists criado_em timestamptz not null default now();
alter table public.fechamentos_caixa add column if not exists salao_id uuid references public.saloes (id) on delete cascade;

-- ---------- 3. Funções auxiliares ----------
create or replace function public.usuario_eh_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.salao_do_usuario()
returns uuid language sql security definer set search_path = public as $$
  select salao_id from public.perfis where id = auth.uid();
$$;

-- Cria um salão novo e torna o usuário atual admin dele
create or replace function public.criar_salao(p_nome text, p_nome_usuario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_salao uuid;
begin
  insert into public.saloes (nome) values (p_nome) returning id into v_salao;

  insert into public.perfis (id, nome, salao_id, role)
  values (auth.uid(), p_nome_usuario, v_salao, 'admin')
  on conflict (id) do update
    set salao_id = excluded.salao_id,
        role = 'admin',
        nome = excluded.nome;

  return v_salao;
end;
$$;

-- Entra em um salão existente usando o código de convite (como usuário comum)
create or replace function public.entrar_no_salao(p_codigo text, p_nome_usuario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_salao uuid;
begin
  select id into v_salao
  from public.saloes
  where codigo_convite = upper(trim(p_codigo));

  if v_salao is null then
    raise exception 'Código de convite inválido';
  end if;

  insert into public.perfis (id, nome, salao_id, role)
  values (auth.uid(), p_nome_usuario, v_salao, 'user')
  on conflict (id) do update
    set salao_id = excluded.salao_id,
        nome = excluded.nome;

  return v_salao;
end;
$$;

grant execute on function public.criar_salao(text, text) to authenticated;
grant execute on function public.entrar_no_salao(text, text) to authenticated;

-- Preenche salao_id automaticamente nos inserts (o app não precisa enviar)
create or replace function public.set_salao_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.salao_id is null then
    new.salao_id := public.salao_do_usuario();
  end if;
  return new;
end;
$$;

-- ---------- 4. Backfill: move dados existentes para um salão padrão ----------
do $$
declare
  v_salao uuid;
  t text;
  tabelas text[] := array[
    'clientes', 'servicos', 'profissionais', 'agendamentos',
    'vendas', 'pagamentos', 'produtos', 'movimentacoes_estoque',
    'fechamentos_caixa'
  ];
begin
  -- Só cria o salão padrão se houver algum dado antigo sem salão
  if exists (select 1 from public.perfis where salao_id is null)
     or exists (select 1 from public.clientes where salao_id is null) then

    insert into public.saloes (nome) values ('Meu Salão') returning id into v_salao;

    update public.perfis set salao_id = v_salao where salao_id is null;

    foreach t in array tabelas loop
      execute format('update public.%I set salao_id = %L where salao_id is null;', t, v_salao);
    end loop;
  end if;
end $$;

-- ---------- 5. Triggers de preenchimento ----------
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
    execute format('drop trigger if exists trg_set_salao_id on public.%I;', t);
    execute format(
      'create trigger trg_set_salao_id before insert on public.%I
       for each row execute function public.set_salao_id();', t);
  end loop;
end $$;

-- fechamentos_caixa: unicidade por salão + data (em vez de só data)
alter table public.fechamentos_caixa drop constraint if exists fechamentos_caixa_data_key;
create unique index if not exists fechamentos_caixa_salao_data
  on public.fechamentos_caixa (salao_id, data);

-- ---------- 6. Ativa RLS ----------
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

-- ---------- 7. Policies ----------

-- saloes: cada membro lê o próprio salão (para ver nome e código de convite).
drop policy if exists saloes_select on public.saloes;
create policy saloes_select on public.saloes
  for select to authenticated
  using (id = public.salao_do_usuario());

-- perfis: usuário lê o próprio perfil e os colegas do mesmo salão.
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or salao_id = public.salao_do_usuario());

-- Permite ao usuário criar/atualizar o próprio perfil (usado no onboarding).
drop policy if exists perfis_insert on public.perfis;
create policy perfis_insert on public.perfis
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists perfis_update on public.perfis;
create policy perfis_update on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists perfis_admin_all on public.perfis;
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
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format('drop policy if exists %I_delete on public.%I;', t, t);
    -- limpa também nomes antigos usados na versão single-tenant
    execute format('drop policy if exists fechamentos_select on public.%I;', t);
    execute format('drop policy if exists fechamentos_insert on public.%I;', t);
    execute format('drop policy if exists fechamentos_delete on public.%I;', t);

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
-- PRONTO. A partir de agora:
-- - Cada salão só enxerga os próprios dados.
-- - Novos donos se cadastram e criam o salão (viram admin).
-- - Funcionários entram com o código de convite do salão.
-- - Seus dados antigos ficaram no salão "Meu Salão".
-- ============================================================
