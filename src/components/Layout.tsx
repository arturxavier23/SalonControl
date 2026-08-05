import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

type LayoutProps = {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-screen text-white">
      <Sidebar aberto={menuAberto} onFechar={() => setMenuAberto(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header onAbrirMenu={() => setMenuAberto(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
