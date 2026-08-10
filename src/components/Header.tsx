import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { obterPerfilUsuario } from '../services/auth'

type HeaderProps = {
  onAbrirMenu?: () => void
}

type SalaoItem = {
  id: string
  nome: string
  role: string
}

function Header({ onAbrirMenu }: HeaderProps) {
  const navigate = useNavigate()
  const [emailUsuario, setEmailUsuario] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [saloes, setSaloes] = useState<SalaoItem[]>([])
  const [salaoAtivo, setSalaoAtivo] = useState('')
  const [escuro, setEscuro] = useState(false)

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'))
  }, [])

  function alternarTema() {
    const novo = !escuro
    document.documentElement.classList.toggle('dark', novo)
    localStorage.setItem('tema', novo ? 'dark' : 'light')
    setEscuro(novo)
  }

  async function carregar() {
    const { data } = await supabase.auth.getUser()
    if (data.user?.email) {
      setEmailUsuario(data.user.email)
    }

    const perfil = await obterPerfilUsuario()
    setAvatarUrl(perfil?.avatar_url ?? null)
    setEhAdmin(perfil?.role === 'admin')
    setSalaoAtivo(perfil?.salao_id ?? '')

    const { data: lista } = await supabase.rpc('meus_saloes')
    setSaloes((lista as SalaoItem[]) ?? [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function trocarFilial(id: string) {
    if (!id || id === salaoAtivo) return

    const { error } = await supabase.rpc('trocar_salao', { p_salao: id })
    if (error) {
      console.error(error)
      return
    }
    window.location.reload()
  }

  async function novaFilial() {
    const nome = window.prompt('Nome da nova filial:')
    if (!nome) return

    const { error } = await supabase.rpc('criar_filial', { p_nome: nome })
    if (error) {
      console.error(error)
      alert('Erro ao criar filial.')
      return
    }
    window.location.reload()
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

  const inicial = (emailUsuario || '?').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-line bg-glass px-4 backdrop-blur-xl md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menu"
          className="rounded-lg border border-line p-2 text-ink-muted hover:bg-elevated hover:text-ink md:hidden"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {ehAdmin && saloes.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={salaoAtivo}
              onChange={(event) => trocarFilial(event.target.value)}
              className="max-w-[45vw] truncate rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-violet-500 md:max-w-xs"
              title="Trocar de filial"
            >
              {saloes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={novaFilial}
              title="Nova filial"
              className="rounded-lg border border-line px-2.5 py-2 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
            >
              +
            </button>
          </div>
        ) : (
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-ink">
              {saloes[0]?.nome ?? 'Sistema de Gestão'}
            </h2>
            <p className="truncate text-sm text-ink-subtle">Salões e barbearias</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={alternarTema}
          title={escuro ? 'Modo claro' : 'Modo escuro'}
          aria-label="Alternar tema"
          className="rounded-lg border border-line p-2 text-ink-muted hover:bg-elevated hover:text-ink"
        >
          {escuro ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {ehAdmin && (
          <Link
            to="/salao"
            title="Configurações do salão"
            className="rounded-lg border border-line p-2 text-ink-muted hover:bg-elevated hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        )}

        <Link
          to="/perfil"
          title="Meu perfil"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-ink shadow-lg shadow-indigo-500/25"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            inicial
          )}
        </Link>

        <button
          type="button"
          onClick={sair}
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:border-strong hover:text-ink"
        >
          Sair
        </button>
      </div>
    </header>
  )
}

export default Header
