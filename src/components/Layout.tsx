import { useState } from 'react'
import { motion } from 'motion/react'
import Sidebar from './Sidebar'
import Header from './Header'

type LayoutProps = {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-screen text-ink">
      <Sidebar aberto={menuAberto} onFechar={() => setMenuAberto(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Header onAbrirMenu={() => setMenuAberto(true)} />

        <motion.main
          className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

export default Layout
