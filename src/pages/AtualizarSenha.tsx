import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Button from '../components/Button'
import Input from '../components/Input'

function AtualizarSenha() {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [ok, setOk] = useState(false)

  const [verificando, setVerificando] = useState(true)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true)
      setVerificando(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setPronto(true)
      setVerificando(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function atualizar(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')

    if (senha.length < 6) {
      setMensagemErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmar) {
      setMensagemErro('As senhas não conferem.')
      return
    }

    try {
      setCarregando(true)

      const { error } = await supabase.auth.updateUser({ password: senha })

      if (error) {
        console.error(error)
        setMensagemErro('Não foi possível atualizar a senha. ' + error.message)
        return
      }

      setOk(true)
      await supabase.auth.signOut()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao atualizar a senha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Nova senha</h1>
          <p className="mt-1 text-zinc-400">Defina a sua nova senha de acesso.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {ok ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
                Senha atualizada com sucesso! Agora é só entrar com a nova senha.
              </div>
              <Link
                to="/"
                className="block text-center text-sm text-violet-400 hover:text-violet-300"
              >
                Ir para o login
              </Link>
            </div>
          ) : verificando ? (
            <p className="text-center text-zinc-400">Carregando...</p>
          ) : !pronto ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
                Link inválido ou expirado. Peça um novo link de recuperação.
              </div>
              <Link
                to="/esqueci-senha"
                className="block text-center text-sm text-violet-400 hover:text-violet-300"
              >
                Pedir novo link
              </Link>
            </div>
          ) : (
            <form onSubmit={atualizar} className="space-y-4">
              {mensagemErro && (
                <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
                  {mensagemErro}
                </div>
              )}

              <Input
                id="senha"
                label="Nova senha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Mínimo 6 caracteres"
              />

              <Input
                id="confirmar"
                label="Confirmar nova senha"
                type="password"
                value={confirmar}
                onChange={(event) => setConfirmar(event.target.value)}
                placeholder="Repita a nova senha"
              />

              <Button type="submit" fullWidth disabled={carregando}>
                {carregando ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AtualizarSenha
