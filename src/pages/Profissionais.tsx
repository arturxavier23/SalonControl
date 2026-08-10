import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'

type Profissional = {
  id: string
  nome: string
  telefone: string | null
  percentual_comissao: number
  ativo: boolean
  criado_em: string
}

function Profissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [profissionalEditandoId, setProfissionalEditandoId] = useState<
    string | null
  >(null)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [percentualComissao, setPercentualComissao] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [usuarioAdministrador, setUsuarioAdministrador] = useState(false)
  const [busca, setBusca] = useState('')

  const nomeInputRef = useRef<HTMLInputElement>(null)

  function handleEnterComoTab(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter') return

    const target = event.target as HTMLElement

    if (target.tagName === 'TEXTAREA') return

    event.preventDefault()

    const form = event.currentTarget

    const campos = Array.from(
      form.querySelectorAll<HTMLElement>('input, select, textarea, button')
    ).filter((elemento) => !elemento.hasAttribute('disabled'))

    const indexAtual = campos.indexOf(target)

    if (indexAtual >= 0 && indexAtual < campos.length - 1) {
      campos[indexAtual + 1].focus()
    }
  }

  async function buscarProfissionais() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao buscar profissionais.')
      setCarregando(false)
      return
    }

    setProfissionais(data || [])
    setCarregando(false)
  }

  async function salvarProfissional(event: React.FormEvent) {
    event.preventDefault()

    setMensagemErro('')

    if (!nome) {
      setMensagemErro('Nome é obrigatório.')
      return
    }

    try {
      setSalvando(true)

      if (profissionalEditandoId) {
        const { error } = await supabase
          .from('profissionais')
          .update({
            nome,
            telefone: telefone || null,
            percentual_comissao: Number(percentualComissao || 0),
          })
          .eq('id', profissionalEditandoId)

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao atualizar profissional.')
          return
        }

        setProfissionalEditandoId(null)
      } else {
        const { error } = await supabase.from('profissionais').insert({
          nome,
          telefone: telefone || null,
          percentual_comissao: Number(percentualComissao || 0),
          ativo: true,
        })

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao cadastrar profissional.')
          return
        }
      }

      limparFormulario()
      await buscarProfissionais()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao salvar profissional.')
    } finally {
      setSalvando(false)
    }
  }

  function editarProfissional(profissional: Profissional) {
    setMensagemErro('')
    setProfissionalEditandoId(profissional.id)
    setNome(profissional.nome)
    setTelefone(profissional.telefone || '')
    setPercentualComissao(String(profissional.percentual_comissao || ''))

    setTimeout(() => {
      nomeInputRef.current?.focus()
    }, 0)
  }

  function limparFormulario() {
    setProfissionalEditandoId(null)
    setNome('')
    setTelefone('')
    setPercentualComissao('')
    setMensagemErro('')
  }

  async function removerProfissional(id: string) {
    if (!usuarioAdministrador) {
      setMensagemErro('Apenas administradores podem remover profissionais.')
      return
    }

    const confirmar = confirm('Deseja remover este profissional?')

    if (!confirmar) return

    const { error } = await supabase.from('profissionais').delete().eq('id', id)

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao remover profissional.')
      return
    }

    buscarProfissionais()
  }

  async function carregarPermissaoUsuario() {
    const ehAdmin = await usuarioEhAdmin()
    setUsuarioAdministrador(ehAdmin)
  }

  useEffect(() => {
    buscarProfissionais()
    carregarPermissaoUsuario()
  }, [])

  const termoBusca = busca.trim().toLowerCase()
  const profissionaisFiltrados = profissionais.filter((profissional) =>
    [profissional.nome, profissional.telefone ?? '']
      .join(' ')
      .toLowerCase()
      .includes(termoBusca)
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <p className="text-ink-muted">
            Cadastre os profissionais do salão ou barbearia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => nomeInputRef.current?.focus()}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-ink px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-500/25 hover:from-violet-500 hover:to-indigo-500"
        >
          Novo profissional
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={salvarProfissional}
          onKeyDown={handleEnterComoTab}
          className="bg-surface border border-line rounded-2xl shadow-lg shadow-black/5 backdrop-blur-sm p-5 space-y-4"
        >
          <h2 className="text-xl font-semibold">
            {profissionalEditandoId
              ? 'Editar profissional'
              : 'Novo profissional'}
          </h2>

          {mensagemErro && (
            <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-3 py-2 text-sm">
              {mensagemErro}
            </div>
          )}

          <div>
            <label className="block text-sm text-ink-muted mb-1">
              Nome *
            </label>
            <input
              ref={nomeInputRef}
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-muted mb-1">
              Telefone
            </label>
            <input
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={telefone}
              onChange={(event) => setTelefone(event.target.value)}
              placeholder="Ex: 65 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-muted mb-1">
              Comissão %
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={percentualComissao}
              onChange={(event) => setPercentualComissao(event.target.value)}
              placeholder="Ex: 40"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-ink px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando
              ? 'Salvando...'
              : profissionalEditandoId
                ? 'Salvar alterações'
                : 'Cadastrar profissional'}
          </button>

          {profissionalEditandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="w-full border border-line text-ink-muted hover:bg-elevated hover:text-ink px-4 py-2 rounded-lg font-medium"
            >
              Cancelar edição
            </button>
          )}
        </form>

        <div className="lg:col-span-2 bg-surface border border-line rounded-2xl shadow-lg shadow-black/5 backdrop-blur-sm p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Profissionais cadastrados</h2>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-64"
            />
          </div>

          {carregando ? (
            <p className="text-ink-muted">Carregando profissionais...</p>
          ) : profissionaisFiltrados.length === 0 ? (
            <p className="text-ink-muted">
              {profissionais.length === 0
                ? 'Nenhum profissional cadastrado ainda.'
                : 'Nenhum profissional encontrado para essa busca.'}
            </p>
          ) : (
            <div className="space-y-3">
              {profissionaisFiltrados.map((profissional) => (
                <div
                  key={profissional.id}
                  className="bg-surface-2 border border-line rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold">{profissional.nome}</h3>

                    {profissional.telefone && (
                      <p className="text-sm text-ink-muted">
                        {profissional.telefone}
                      </p>
                    )}

                    <p className="text-sm text-ink-subtle mt-1">
                      Comissão:{' '}
                      {Number(profissional.percentual_comissao)
                        .toFixed(2)
                        .replace('.', ',')}
                      %
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => editarProfissional(profissional)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Editar
                    </button>

                    {usuarioAdministrador && (
                      <button
                        onClick={() => removerProfissional(profissional.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Profissionais