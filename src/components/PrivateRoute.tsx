import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { obterPerfilUsuario } from '../services/auth'

type PrivateRouteProps = {
  children: React.ReactNode
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const [carregando, setCarregando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)
  const [temSalao, setTemSalao] = useState(false)
  const [ehSuperAdmin, setEhSuperAdmin] = useState(false)

  async function verificar() {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      setAutenticado(false)
      setTemSalao(false)
      setCarregando(false)
      return
    }

    setAutenticado(true)

    const perfil = await obterPerfilUsuario()
    setEhSuperAdmin(!!perfil?.super_admin)
    setTemSalao(!!perfil?.salao_id)
    setCarregando(false)
  }

  useEffect(() => {
    verificar()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      verificar()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink">
        Carregando...
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/" replace />
  }

  if (!temSalao) {
    return <Navigate to={ehSuperAdmin ? '/admin' : '/onboarding'} replace />
  }

  return children
}

export default PrivateRoute
