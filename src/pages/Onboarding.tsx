import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { obterPerfilUsuario } from '../services/auth'
import Button from '../components/Button'
import Input from '../components/Input'

function Onboarding() {
  const navigate = useNavigate()

  const [verificando, setVerificando] = useState(true)
  const [modo, setModo] = useState<'criar' | 'entrar'>('criar')

  const [nomeUsuario, setNomeUsuario] = useState('')
  const [nomeSalao, setNomeSalao] = useState('')
  const [codigo, setCodigo] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  useEffect(() => {
    async function verificar() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        navigate('/')
        return
      }

      const perfil = await obterPerfilUsuario()
      if (perfil?.super_admin) {
        navigate('/admin')
        return
      }
      if (perfil?.salao_id) {
        navigate('/dashboard')
        return
      }

      setVerificando(false)
    }

    verificar()
  }, [navigate])

  async function criarSalao(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')

    if (!nomeUsuario || !nomeSalao) {
      setMensagemErro('Informe seu nome e o nome do salão.')
      return
    }

    try {
      setSalvando(true)

      const { error } = await supabase.rpc('criar_salao', {
        p_nome: nomeSalao,
        p_nome_usuario: nomeUsuario,
      })

      if (error) {
        console.error(error)
        setMensagemErro('Erro ao criar o salão. ' + error.message)
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao criar o salão.')
    } finally {
      setSalvando(false)
    }
  }

  async function entrarComCodigo(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')

    if (!nomeUsuario || !codigo) {
      setMensagemErro('Informe seu nome e o código de convite.')
      return
    }

    try {
      setSalvando(true)

      const { error } = await supabase.rpc('entrar_no_salao', {
        p_codigo: codigo,
        p_nome_usuario: nomeUsuario,
      })

      if (error) {
        console.error(error)
        setMensagemErro('Código inválido ou erro ao entrar no salão.')
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao entrar no salão.')
    } finally {
      setSalvando(false)
    }
  }

  async function sair() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        Carregando...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Bem-vindo!</h1>
          <p className="mt-1 text-zinc-400">
            Crie o seu salão ou entre em um com o código de convite.
          </p>
        </div>

        <div className="mb-4 flex rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setModo('criar')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              modo === 'criar'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Criar salão
          </button>
          <button
            type="button"
            onClick={() => setModo('entrar')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              modo === 'entrar'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            Entrar com código
          </button>
        </div>

        {modo === 'criar' ? (
          <form
            onSubmit={criarSalao}
            className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm"
          >
            {mensagemErro && (
              <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
                {mensagemErro}
              </div>
            )}

            <Input
              id="nome-usuario"
              label="Seu nome"
              value={nomeUsuario}
              onChange={(event) => setNomeUsuario(event.target.value)}
              placeholder="Ex: Artur"
            />

            <Input
              id="nome-salao"
              label="Nome do salão"
              value={nomeSalao}
              onChange={(event) => setNomeSalao(event.target.value)}
              placeholder="Ex: Barbearia do Artur"
            />

            <Button type="submit" fullWidth disabled={salvando}>
              {salvando ? 'Criando...' : 'Criar salão e começar'}
            </Button>

            <p className="text-xs text-zinc-500">
              Você será o administrador deste salão.
            </p>
          </form>
        ) : (
          <form
            onSubmit={entrarComCodigo}
            className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm"
          >
            {mensagemErro && (
              <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
                {mensagemErro}
              </div>
            )}

            <Input
              id="nome-usuario-2"
              label="Seu nome"
              value={nomeUsuario}
              onChange={(event) => setNomeUsuario(event.target.value)}
              placeholder="Ex: Maria"
            />

            <Input
              id="codigo"
              label="Código de convite"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              placeholder="Ex: A1B2C3"
            />

            <Button type="submit" fullWidth disabled={salvando}>
              {salvando ? 'Entrando...' : 'Entrar no salão'}
            </Button>

            <p className="text-xs text-zinc-500">
              Peça o código ao administrador do salão.
            </p>
          </form>
        )}

        <button
          type="button"
          onClick={sair}
          className="mt-6 w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
        >
          Sair desta conta
        </button>
      </div>
    </div>
  )
}

export default Onboarding
