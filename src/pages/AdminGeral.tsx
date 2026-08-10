import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { obterPerfilUsuario } from '../services/auth'
import Button from '../components/Button'
import Input from '../components/Input'

type SalaoLista = {
  id: string
  nome: string
  codigo_convite: string
  criado_em: string
  admin_nome: string
}

// Extrai a mensagem real de erro retornada pela Edge Function.
async function extrairErro(error: unknown, fallback: string): Promise<string> {
  const contexto = (error as { context?: Response })?.context
  if (contexto && typeof contexto.text === 'function') {
    try {
      const texto = await contexto.text()
      try {
        const corpo = JSON.parse(texto)
        if (corpo?.error) return corpo.error
      } catch {
        if (texto) return texto
      }
    } catch {
      // ignora
    }
  }
  const msg = (error as { message?: string })?.message
  return msg ? `${fallback} (${msg})` : fallback
}

function AdminGeral() {
  const navigate = useNavigate()

  const [verificando, setVerificando] = useState(true)
  const [saloes, setSaloes] = useState<SalaoLista[]>([])
  const [carregandoLista, setCarregandoLista] = useState(false)

  const [nomeSalao, setNomeSalao] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [mensagemOk, setMensagemOk] = useState('')

  const [resetSalaoId, setResetSalaoId] = useState<string | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [resetSalvando, setResetSalvando] = useState(false)

  async function carregarSaloes() {
    setCarregandoLista(true)

    const { data, error } = await supabase.functions.invoke('admin-saloes', {
      method: 'GET',
    })

    if (error) {
      console.error(error)
      setMensagemErro(
        await extrairErro(error, 'Não foi possível carregar os salões.')
      )
    } else if (data?.error) {
      setMensagemErro(data.error)
    } else {
      setSaloes(data.saloes ?? [])
    }

    setCarregandoLista(false)
  }

  useEffect(() => {
    async function verificar() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        navigate('/')
        return
      }

      const perfil = await obterPerfilUsuario()
      if (!perfil?.super_admin) {
        navigate('/dashboard')
        return
      }

      setVerificando(false)
      carregarSaloes()
    }

    verificar()
  }, [navigate])

  async function cadastrarSalao(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')
    setMensagemOk('')

    if (!nomeSalao || !nomeAdmin || !email || !senha) {
      setMensagemErro('Preencha todos os campos.')
      return
    }

    try {
      setSalvando(true)

      const { data, error } = await supabase.functions.invoke('admin-saloes', {
        body: { nomeSalao, nomeAdmin, email, senha },
      })

      if (error) {
        console.error(error)
        setMensagemErro(await extrairErro(error, 'Erro ao cadastrar o salão.'))
        return
      }

      if (data?.error) {
        setMensagemErro(data.error)
        return
      }

      setMensagemOk(
        `Salão "${data.salao.nome}" criado. Código de convite: ${data.salao.codigo_convite}. Login do admin: ${data.salao.admin_email}`
      )
      setNomeSalao('')
      setNomeAdmin('')
      setEmail('')
      setSenha('')
      await carregarSaloes()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao cadastrar o salão.')
    } finally {
      setSalvando(false)
    }
  }

  async function redefinirSenha(salaoId: string) {
    setMensagemErro('')
    setMensagemOk('')

    if (novaSenha.length < 6) {
      setMensagemErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      setResetSalvando(true)

      const { data, error } = await supabase.functions.invoke('admin-saloes', {
        body: { acao: 'redefinir_senha', salaoId, novaSenha },
      })

      if (error) {
        setMensagemErro(await extrairErro(error, 'Erro ao redefinir a senha.'))
        return
      }

      if (data?.error) {
        setMensagemErro(data.error)
        return
      }

      setMensagemOk('Senha do admin redefinida com sucesso.')
      setResetSalaoId(null)
      setNovaSenha('')
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao redefinir a senha.')
    } finally {
      setResetSalvando(false)
    }
  }

  async function sair() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink">
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-glass px-6 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 2 7l10 5 10-5-10-5z" />
              <path d="m2 17 10 5 10-5" />
              <path d="m2 12 10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold">Console da Plataforma</h1>
            <p className="text-xs text-ink-subtle">Gestão de salões clientes</p>
          </div>
        </div>

        <button
          type="button"
          onClick={sair}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
        >
          Sair
        </button>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-6 md:p-8 lg:grid-cols-3">
        <form
          onSubmit={cadastrarSalao}
          className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm"
        >
          <h2 className="text-xl font-semibold">Novo salão cliente</h2>

          {mensagemErro && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
              {mensagemErro}
            </div>
          )}

          {mensagemOk && (
            <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
              {mensagemOk}
            </div>
          )}

          <Input
            id="nome-salao"
            label="Nome do salão"
            value={nomeSalao}
            onChange={(event) => setNomeSalao(event.target.value)}
            placeholder="Ex: Studio Bella"
          />

          <Input
            id="nome-admin"
            label="Nome do admin"
            value={nomeAdmin}
            onChange={(event) => setNomeAdmin(event.target.value)}
            placeholder="Ex: Beatriz"
          />

          <Input
            id="email-admin"
            label="E-mail do admin (login)"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@studiobella.com"
          />

          <Input
            id="senha-admin"
            label="Senha inicial"
            type="text"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Mínimo 6 caracteres"
          />

          <Button type="submit" fullWidth disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar salão e admin'}
          </Button>

          <p className="text-xs text-ink-subtle">
            O admin poderá trocar a senha depois. Anote e envie o login a ele.
          </p>
        </form>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Salões cadastrados ({saloes.length})
            </h2>
            <button
              type="button"
              onClick={carregarSaloes}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
            >
              Atualizar
            </button>
          </div>

          {carregandoLista ? (
            <p className="text-ink-muted">Carregando salões...</p>
          ) : saloes.length === 0 ? (
            <p className="text-ink-muted">Nenhum salão cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {saloes.map((salao) => (
                <div
                  key={salao.id}
                  className="rounded-lg border border-line bg-surface-2 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{salao.nome}</h3>
                      {salao.admin_nome && (
                        <p className="text-sm text-ink-muted">
                          Admin: {salao.admin_nome}
                        </p>
                      )}
                      <p className="text-xs text-ink-subtle">
                        Criado em{' '}
                        {new Date(salao.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-ink-muted">Código de convite</p>
                      <span className="font-mono tracking-widest text-violet-300">
                        {salao.codigo_convite}
                      </span>
                    </div>
                  </div>

                  {resetSalaoId === salao.id ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={novaSenha}
                        onChange={(event) => setNovaSenha(event.target.value)}
                        placeholder="Nova senha (mín. 6)"
                        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => redefinirSenha(salao.id)}
                          disabled={resetSalvando}
                          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-ink hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
                        >
                          {resetSalvando ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetSalaoId(null)
                            setNovaSenha('')
                          }}
                          className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResetSalaoId(salao.id)
                        setNovaSenha('')
                        setMensagemErro('')
                        setMensagemOk('')
                      }}
                      className="mt-3 text-sm text-violet-400 hover:text-violet-300"
                    >
                      Redefinir senha do admin
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminGeral
