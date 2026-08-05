// Edge Function: admin-saloes
// Console do dono da plataforma (super admin).
//   GET  -> lista os salões
//   POST -> cria salão + login do admin do cliente
//   POST { acao: 'redefinir_senha', salaoId, novaSenha } -> troca a senha do admin
//
// Deploy pelo painel do Supabase (Edge Functions) ou pela CLI:
//   supabase functions deploy admin-saloes --no-verify-jwt
// (deixe o Verify JWT DESLIGADO; a função valida o super admin por dentro)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json({ error: 'Não autenticado.' }, 401)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: perfil } = await admin
    .from('perfis')
    .select('super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil?.super_admin) {
    return json({ error: 'Acesso restrito ao administrador da plataforma.' }, 403)
  }

  // ---------- LISTAR SALÕES ----------
  if (req.method === 'GET') {
    const { data: saloes, error } = await admin
      .from('saloes')
      .select('id, nome, codigo_convite, criado_em')
      .order('criado_em', { ascending: false })

    if (error) {
      return json({ error: error.message })
    }

    const { data: admins } = await admin
      .from('perfis')
      .select('salao_id, nome')
      .eq('role', 'admin')

    const nomePorSalao = new Map<string, string>()
    for (const a of admins ?? []) {
      if (a.salao_id && !nomePorSalao.has(a.salao_id)) {
        nomePorSalao.set(a.salao_id, a.nome ?? '')
      }
    }

    const lista = (saloes ?? []).map((s) => ({
      ...s,
      admin_nome: nomePorSalao.get(s.id) ?? '',
    }))

    return json({ saloes: lista })
  }

  if (req.method === 'POST') {
    let body: {
      acao?: string
      nomeSalao?: string
      nomeAdmin?: string
      email?: string
      senha?: string
      salaoId?: string
      novaSenha?: string
    }

    try {
      body = await req.json()
    } catch {
      return json({ error: 'Corpo inválido.' })
    }

    // ---------- REDEFINIR SENHA DO ADMIN ----------
    if (body.acao === 'redefinir_senha') {
      const salaoId = (body.salaoId ?? '').trim()
      const novaSenha = body.novaSenha ?? ''

      if (!salaoId || !novaSenha) {
        return json({ error: 'Informe o salão e a nova senha.' })
      }
      if (novaSenha.length < 6) {
        return json({ error: 'A senha deve ter pelo menos 6 caracteres.' })
      }

      const { data: adminPerfil } = await admin
        .from('perfis')
        .select('id')
        .eq('salao_id', salaoId)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()

      if (!adminPerfil?.id) {
        return json({ error: 'Este salão não tem um admin cadastrado.' })
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(
        adminPerfil.id,
        { password: novaSenha }
      )

      if (updateError) {
        return json({ error: 'Erro ao redefinir a senha: ' + updateError.message })
      }

      return json({ ok: true })
    }

    // ---------- CRIAR SALÃO + ADMIN ----------
    const nomeSalao = (body.nomeSalao ?? '').trim()
    const nomeAdmin = (body.nomeAdmin ?? '').trim()
    const email = (body.email ?? '').trim()
    const senha = body.senha ?? ''

    if (!nomeSalao || !nomeAdmin || !email || !senha) {
      return json({ error: 'Preencha nome do salão, nome do admin, e-mail e senha.' })
    }

    if (senha.length < 6) {
      return json({ error: 'A senha deve ter pelo menos 6 caracteres.' })
    }

    const { data: salao, error: salaoError } = await admin
      .from('saloes')
      .insert({ nome: nomeSalao })
      .select('id, nome, codigo_convite')
      .single()

    if (salaoError || !salao) {
      return json({ error: 'Erro ao criar o salão.' })
    }

    const { data: novoUsuario, error: usuarioError } =
      await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      })

    if (usuarioError || !novoUsuario?.user) {
      await admin.from('saloes').delete().eq('id', salao.id)
      return json({ error: 'Erro ao criar o usuário: ' + (usuarioError?.message ?? '') })
    }

    const { error: perfilError } = await admin.from('perfis').insert({
      id: novoUsuario.user.id,
      nome: nomeAdmin,
      salao_id: salao.id,
      role: 'admin',
      super_admin: false,
    })

    if (perfilError) {
      await admin.auth.admin.deleteUser(novoUsuario.user.id)
      await admin.from('saloes').delete().eq('id', salao.id)
      return json({ error: 'Erro ao criar o perfil do admin.' })
    }

    return json({
      ok: true,
      salao: {
        id: salao.id,
        nome: salao.nome,
        codigo_convite: salao.codigo_convite,
        admin_nome: nomeAdmin,
        admin_email: email,
      },
    })
  }

  return json({ error: 'Método não suportado.' }, 405)
})
