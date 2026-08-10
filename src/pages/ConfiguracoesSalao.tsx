import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'
import Button from '../components/Button'
import Input from '../components/Input'

function ConfiguracoesSalao() {
  const [salaoId, setSalaoId] = useState('')
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [mensagemOk, setMensagemOk] = useState('')

  useEffect(() => {
    async function carregar() {
      const admin = await usuarioEhAdmin()
      setEhAdmin(admin)

      const { data: salao } = await supabase
        .from('saloes')
        .select('id, nome, codigo_convite, logo_url')
        .maybeSingle()

      if (salao) {
        setSalaoId(salao.id)
        setNome(salao.nome ?? '')
        setCodigo(salao.codigo_convite ?? '')
        setLogoUrl(salao.logo_url ?? null)
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
      setMensagemErro('Informe o nome do salão.')
      return
    }

    try {
      setSalvando(true)

      let novaUrl = logoUrl

      if (arquivo) {
        const ext = arquivo.name.split('.').pop() || 'png'
        const caminho = `logos/${salaoId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('publico')
          .upload(caminho, arquivo, { upsert: true })

        if (uploadError) {
          console.error(uploadError)
          setMensagemErro('Erro ao enviar a logo.')
          return
        }

        const { data } = supabase.storage.from('publico').getPublicUrl(caminho)
        novaUrl = data.publicUrl
      }

      const { error } = await supabase
        .from('saloes')
        .update({ nome: nome.trim(), logo_url: novaUrl })
        .eq('id', salaoId)

      if (error) {
        console.error(error)
        setMensagemErro('Erro ao salvar o salão.')
        return
      }

      setLogoUrl(novaUrl)
      setArquivo(null)
      setMensagemOk('Salão atualizado com sucesso.')
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao salvar o salão.')
    } finally {
      setSalvando(false)
    }
  }

  const preview = arquivo ? URL.createObjectURL(arquivo) : logoUrl

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurações do salão</h1>
        <p className="text-ink-muted">Edite o nome e a logo do salão.</p>
      </div>

      {carregando ? (
        <p className="text-ink-muted">Carregando...</p>
      ) : !ehAdmin ? (
        <p className="text-ink-muted">
          Apenas administradores podem editar o salão.
        </p>
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
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-2 text-2xl font-semibold">
              {preview ? (
                <img
                  src={preview}
                  alt="Logo do salão"
                  className="h-full w-full object-cover"
                />
              ) : (
                (nome || '?').charAt(0).toUpperCase()
              )}
            </div>

            <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-elevated hover:text-ink">
              Escolher logo
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
            id="nome-salao"
            label="Nome do salão"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Nome do salão"
          />

          <div>
            <label className="mb-1 block text-sm text-ink-muted">
              Código de convite da equipe
            </label>
            <input
              value={codigo}
              disabled
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono tracking-widest text-violet-300"
            />
          </div>

          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar salão'}
          </Button>
        </form>
      )}
    </Layout>
  )
}

export default ConfiguracoesSalao
