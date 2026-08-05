import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Button from '../components/Button'
import Input from '../components/Input'

function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function enviar(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')

    if (!email) {
      setMensagemErro('Informe o seu e-mail.')
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      })

      if (error) {
        console.error(error)
        setMensagemErro('Não foi possível enviar o e-mail. Tente novamente.')
        return
      }

      setEnviado(true)
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao enviar o e-mail.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Recuperar senha</h1>
          <p className="mt-1 text-zinc-400">
            Enviaremos um link para você criar uma nova senha.
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
              Se existir uma conta com esse e-mail, enviamos um link para
              redefinir a senha. Confira sua caixa de entrada (e o spam).
            </div>
            <Link
              to="/"
              className="block text-center text-sm text-violet-400 hover:text-violet-300"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm"
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

            <Button type="submit" fullWidth disabled={carregando}>
              {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <Link
              to="/"
              className="block text-center text-sm text-zinc-400 hover:text-zinc-200"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}

export default EsqueciSenha
