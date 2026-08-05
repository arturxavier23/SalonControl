-- ============================================================
-- SalonControl — Super Admin (dono da plataforma)
-- Rode DEPOIS da migração multi-tenant.
-- Cria a marca de "super admin" e a função auxiliar.
-- ============================================================

-- Marca no perfil quem é dono da plataforma (você).
alter table public.perfis
  add column if not exists super_admin boolean not null default false;

-- Função para checar super admin (usada nas policies, ignora RLS).
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce(
    (select super_admin from public.perfis where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- COMO SE TORNAR SUPER ADMIN:
-- 1) Crie uma conta normalmente na tela de Cadastro do app
--    (não precisa criar salão).
-- 2) Rode o comando abaixo trocando pelo SEU e-mail. Ele cria/atualiza
--    o seu perfil marcando super_admin = true.
--
-- insert into public.perfis (id, super_admin, role)
-- select id, true, 'user' from auth.users
-- where email = 'artur23xavier@outlook.com'
-- on conflict (id) do update set super_admin = true;
--
-- 3) Faça login: você será levado direto ao console em /admin.
-- ============================================================
