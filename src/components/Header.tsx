import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

type HeaderProps = {
  onAbrirMenu?: () => void
}

function Header({ onAbrirMenu }: HeaderProps) {
  const navigate = useNavigate()
  const [emailUsuario, setEmailUsuario] = useState('')

  async function buscarUsuario() {
    const { data } = await supabase.auth.getUser()

    if (data.user?.email) {
      setEmailUsuario(data.user.email)
    }
  }

  async function sair() {
    const confirmar = confirm('Deseja sair do sistema?')

    if (!confirmar) return

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      alert('Erro ao sair do sistema')
      return
    }

    navigate('/')
  }

  useEffect(() => {
    buscarUsuario()
  }, [])

  const inicial = (emailUsuario || '?').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/10 bg-zinc-950/60 px-6 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menu"
          className="rounded-lg border border-white/15 p-2 text-zinc-300 hover:bg-white/5 hover:text-white md:hidden"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div>
          <h2 className="font-semibold text-white">Sistema de Gestão</h2>
          <p className="text-sm text-zinc-500">Salões e barbearias</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs text-zinc-500">Usuário logado</p>
          <p className="text-sm text-zinc-200">
            {emailUsuario || 'Carregando...'}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40">
          {inicial}
        </div>

        <button
          type="button"
          onClick={sair}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 outline-none hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>
    </header>
  )
}

export default Header
