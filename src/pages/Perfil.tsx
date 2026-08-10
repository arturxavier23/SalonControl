import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import Button from '../components/Button'
import Input from '../components/Input'

function Perfil() {
  const [usuarioId, setUsuarioId] = useState('')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [mensagemOk, setMensagemOk] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) return

      setUsuarioId(user.id)
      setEmail(user.email ?? '')

      const { data: perfil } = await supabase
        .from('perfis')
        .select('nome, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (perfil) {
        setNome(perfil.nome ?? '')
        setAvatarUrl(perfil.avatar_url ?? null)
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  async function salvar(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')
    setMensagemOk('')

    if (!nome.trim()) {
      setMensagemErro('Informe o seu nome.')
      return
    }

    try {
      setSalvando(true)

      let novaUrl = avatarUrl

      if (arquivo) {
        const ext = arquivo.name.split('.').pop() || 'png'
        const caminho = `avatares/${usuarioId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('publico')
          .upload(caminho, arquivo, { upsert: true })

        if (uploadError) {
          console.error(uploadError)
          setMensagemErro('Erro ao enviar a foto.')
          return
        }

        const { data } = supabase.storage.from('publico').getPublicUrl(caminho)
        novaUrl = data.publicUrl
      }

      const { error } = await supabase
        .from('perfis')
        .update({ nome: nome.trim(), avatar_url: novaUrl })
        .eq('id', usuarioId)

      if (error) {
        console.error(error)
        setMensagemErro('Erro ao salvar o perfil.')
        return
      }

      setAvatarUrl(novaUrl)
      setArquivo(null)
      setMensagemOk('Perfil atualizado com sucesso.')
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao salvar o perfil.')
    } finally {
      setSalvando(false)
    }
  }

  const preview = arquivo ? URL.createObjectURL(arquivo) : avatarUrl

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meu perfil</h1>
        <p className="text-ink-muted">Edite seu nome e sua foto.</p>
      </div>

      {carregando ? (
        <p className="text-ink-muted">Carregando...</p>
      ) : (
        <form
          onSubmit={salvar}
          className="max-w-lg space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-lg shadow-black/5 backdrop-blur-sm"
        >
          {mensagemErro && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
              {mensagemErro}
            </div>
          )}
          {mensagemOk && (
            <div className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
              {mensagemOk}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-2xl font-semibold">
              {preview ? (
                <img
                  src={preview}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                (nome || email || '?').charAt(0).toUpperCase()
              )}
            </div>

            <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-elevated hover:text-ink">
              Escolher foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  setArquivo(event.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>

          <Input
            id="nome"
            label="Nome"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Seu nome"
          />

          <div>
            <label className="mb-1 block text-sm text-ink-muted">E-mail</label>
            <input
              value={email}
              disabled
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-ink-subtle"
            />
          </div>

          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        </form>
      )}
    </Layout>
  )
}

export default Perfil
