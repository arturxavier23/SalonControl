import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { obterPerfilUsuario } from '../services/auth'
import Button from '../components/Button'
import Input from '../components/Input'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  async function fazerLogin(event: React.FormEvent) {
    event.preventDefault()

    setMensagemErro('')

    if (!email || !senha) {
      setMensagemErro('E-mail e senha são obrigatórios.')
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        console.error(error)
        setMensagemErro('E-mail ou senha inválidos.')
        return
      }

      const perfil = await obterPerfilUsuario()
      if (perfil?.super_admin) {
        navigate('/admin')
      } else if (perfil?.salao_id) {
        navigate('/dashboard')
      } else {
        navigate('/onboarding')
      }
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao fazer login.')
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
          <h1 className="text-3xl font-bold">SalonControl</h1>
          <p className="mt-1 text-ink-muted">Acesse o sistema de gestão.</p>
        </div>

        <form
          onSubmit={fazerLogin}
          className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-black/10 backdrop-blur-sm"
        >
          {mensagemErro && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
              {mensagemErro}
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
            placeholder="Digite sua senha"
          />

          <Button type="submit" fullWidth disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="text-center">
            <Link
              to="/esqueci-senha"
              className="text-sm text-ink-muted hover:text-ink"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-violet-400 hover:text-violet-300">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
