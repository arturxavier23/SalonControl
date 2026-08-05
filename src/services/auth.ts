import { supabase } from './supabase'

export async function obterPerfilUsuario() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return null
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (perfilError) {
    console.error(perfilError)
    return null
  }

  return perfil
}

export async function usuarioEhAdmin() {
  const perfil = await obterPerfilUsuario()

  return perfil?.role === 'admin'
}