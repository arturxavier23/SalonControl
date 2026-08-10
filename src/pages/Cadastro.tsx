import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Button from '../components/Button'
import Input from '../components/Input'

function Cadastro() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [mensagemInfo, setMensagemInfo] = useState('')

  async function cadastrar(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')
    setMensagemInfo('')

    if (!email || !senha) {
      setMensagemErro('E-mail e senha são obrigatórios.')
      return
    }

    if (senha.length < 6) {
      setMensagemErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setMensagemErro('As senhas não conferem.')
      return
    }

    try {
      setCarregando(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      })

      if (error) {
        console.error(error)
        setMensagemErro('Não foi possível criar a conta. ' + error.message)
        return
      }

      if (data.session) {
        navigate('/onboarding')
      } else {
        setMensagemInfo(
          'Conta criada! Confirme o e-mail que enviamos e depois faça login.'
        )
      }
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao criar a conta.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-indigo-500/25">
            <svg className="h-7 w-7 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 4h10l-1 8a4 4 0 0 1-8 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Criar conta</h1>
          <p className="mt-1 text-ink-muted">
            Comece a usar o SalonControl no seu salão.
          </p>
        </div>

        <form
          onSubmit={cadastrar}
          className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/10 backdrop-blur-sm"
        >
          {mensagemErro && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
              {mensagemErro}
            </div>
          )}

          {mensagemInfo && (
            <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
              {mensagemInfo}
            </div>
          )}

          <Input
            id="email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
          />

          <Input
            id="senha"
            label="Senha"
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Mínimo 6 caracteres"
          />

          <Input
            id="confirmar"
            label="Confirmar senha"
            type="password"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            placeholder="Repita a senha"
          />

          <Button type="submit" fullWidth disabled={carregando}>
            {carregando ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Já tem conta?{' '}
          <Link to="/" className="text-violet-400 hover:text-violet-300">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Cadastro
