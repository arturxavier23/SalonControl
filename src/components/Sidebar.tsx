import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../services/supabase'

type SidebarProps = {
  aberto?: boolean
  onFechar?: () => void
}

type MarcaSalao = {
  nome: string
  logoUrl: string | null
}

type ItemMenu = {
  to: string
  label: string
  icon: React.ReactNode
}

const iconeClasse = 'h-5 w-5 shrink-0'

const itens: ItemMenu[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/servicos',
    label: 'Serviços',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: '/profissionais',
    label: 'Profissionais',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: '/agenda',
    label: 'Agenda',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/caixa',
    label: 'Caixa',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="17" cy="15" r="1.5" />
      </svg>
    ),
  },
  {
    to: '/estoque',
    label: 'Estoque',
    icon: (
      <svg className={iconeClasse} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
]

function ConteudoSidebar({
  onFechar,
  marca,
}: {
  onFechar?: () => void
  marca: MarcaSalao
}) {
  return (
    <>
      <div className="mb-10 flex items-center gap-3">
        {marca.logoUrl ? (
          <img
            src={marca.logoUrl}
            alt="Logo"
            className="h-16 w-16 shrink-0 rounded-xl object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-950/40">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 4h10l-1 8a4 4 0 0 1-8 0z" />
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-white">
            {marca.nome || 'SalonControl'}
          </h1>
          <p className="truncate text-xs text-zinc-500">SalonControl</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onFechar}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-white ring-1 ring-inset ring-violet-500/30'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

function Sidebar({ aberto = false, onFechar }: SidebarProps) {
  const [marca, setMarca] = useState<MarcaSalao>({ nome: '', logoUrl: null })

  useEffect(() => {
    async function carregarMarca() {
      const { data } = await supabase
        .from('saloes')
        .select('nome, logo_url')
        .maybeSingle()

      if (data) {
        setMarca({ nome: data.nome ?? '', logoUrl: data.logo_url ?? null })

        // Título da aba com o nome do salão
        document.title = data.nome
          ? `${data.nome} — SalonControl`
          : 'SalonControl'

        // Favicon com a logo do salão
        if (data.logo_url) {
          let icone = document.querySelector<HTMLLinkElement>(
            "link[rel~='icon']"
          )
          if (!icone) {
            icone = document.createElement('link')
            icone.rel = 'icon'
            document.head.appendChild(icone)
          }
          icone.href = data.logo_url
        }
      }
    }

    carregarMarca()
  }, [])

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-900/50 p-6 backdrop-blur-xl md:block">
        <ConteudoSidebar marca={marca} />
      </aside>

      {/* Mobile (drawer) */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onFechar}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-white/10 bg-zinc-900 p-6">
            <ConteudoSidebar marca={marca} onFechar={onFechar} />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
