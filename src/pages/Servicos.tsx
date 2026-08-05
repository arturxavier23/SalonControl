import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'

type Servico = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao_minutos: number
  ativo: boolean
  criado_em: string
}

function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [servicoEditandoId, setServicoEditandoId] = useState<string | null>(
    null
  )

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')
  const [usuarioAdministrador, setUsuarioAdministrador] = useState(false)
  const [busca, setBusca] = useState('')

  const nomeInputRef = useRef<HTMLInputElement>(null)

  function handleEnterComoTab(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter') return

    const target = event.target as HTMLElement

    if (target.tagName === 'TEXTAREA') {
      return
    }

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

  async function buscarServicos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao buscar serviços.')
      setCarregando(false)
      return
    }

    setServicos(data || [])
    setCarregando(false)
  }

  async function salvarServico(event: React.FormEvent) {
    event.preventDefault()

    setMensagemErro('')

    if (!nome || !preco || !duracaoMinutos) {
      setMensagemErro('Nome, preço e duração são obrigatórios.')
      return
    }

    try {
      setSalvando(true)

      if (servicoEditandoId) {
        const { error } = await supabase
          .from('servicos')
          .update({
            nome,
            descricao: descricao || null,
            preco: Number(preco),
            duracao_minutos: Number(duracaoMinutos),
          })
          .eq('id', servicoEditandoId)

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao atualizar serviço.')
          return
        }

        setServicoEditandoId(null)
      } else {
        const { error } = await supabase.from('servicos').insert({
          nome,
          descricao: descricao || null,
          preco: Number(preco),
          duracao_minutos: Number(duracaoMinutos),
          ativo: true,
        })

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao cadastrar serviço.')
          return
        }
      }

      limparFormulario()
      await buscarServicos()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao salvar serviço.')
    } finally {
      setSalvando(false)
    }
  }

  function editarServico(servico: Servico) {
    setMensagemErro('')
    setServicoEditandoId(servico.id)
    setNome(servico.nome)
    setDescricao(servico.descricao || '')
    setPreco(String(servico.preco))
    setDuracaoMinutos(String(servico.duracao_minutos))

    setTimeout(() => {
      nomeInputRef.current?.focus()
    }, 0)
  }

  function limparFormulario() {
    setServicoEditandoId(null)
    setNome('')
    setDescricao('')
    setPreco('')
    setDuracaoMinutos('')
    setMensagemErro('')
  }

  async function removerServico(id: string) {
    if (!usuarioAdministrador) {
      setMensagemErro('Apenas administradores podem remover serviços.')
      return
    }

    const confirmar = confirm('Deseja remover este serviço?')

    if (!confirmar) return

    const { error } = await supabase.from('servicos').delete().eq('id', id)

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao remover serviço.')
      return
    }

    buscarServicos()
  }

  async function carregarPermissaoUsuario() {
    const ehAdmin = await usuarioEhAdmin()
    setUsuarioAdministrador(ehAdmin)
  }

  useEffect(() => {
    buscarServicos()
    carregarPermissaoUsuario()
  }, [])

  const servicosFiltrados = servicos.filter((servico) =>
    servico.nome.toLowerCase().includes(busca.trim().toLowerCase())
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Serviços</h1>
          <p className="text-zinc-400">
            Cadastre os serviços oferecidos pelo salão ou barbearia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => nomeInputRef.current?.focus()}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-950/40 hover:from-violet-500 hover:to-indigo-500"
        >
          Novo serviço
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={salvarServico}
          onKeyDown={handleEnterComoTab}
          className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 backdrop-blur-sm p-5 space-y-4"
        >
          <h2 className="text-xl font-semibold">
            {servicoEditandoId ? 'Editar serviço' : 'Novo serviço'}
          </h2>

          {mensagemErro && (
            <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-3 py-2 text-sm">
              {mensagemErro}
            </div>
          )}

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Nome *
            </label>
            <input
              ref={nomeInputRef}
              className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex: Corte masculino"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Descrição
            </label>
            <textarea
              className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 min-h-24"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Ex: Corte com máquina e tesoura"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Preço *
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={preco}
              onChange={(event) => setPreco(event.target.value)}
              placeholder="Ex: 40"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Duração em minutos *
            </label>
            <input
              type="number"
              className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={duracaoMinutos}
              onChange={(event) => setDuracaoMinutos(event.target.value)}
              placeholder="Ex: 30"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-950/40 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando
              ? 'Salvando...'
              : servicoEditandoId
                ? 'Salvar alterações'
                : 'Cadastrar serviço'}
          </button>

          {servicoEditandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="w-full border border-white/15 text-zinc-300 hover:bg-white/5 hover:text-white px-4 py-2 rounded-lg font-medium"
            >
              Cancelar edição
            </button>
          )}
        </form>

        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 backdrop-blur-sm p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Serviços cadastrados</h2>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome..."
              className="w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-64"
            />
          </div>

          {carregando ? (
            <p className="text-zinc-400">Carregando serviços...</p>
          ) : servicosFiltrados.length === 0 ? (
            <p className="text-zinc-400">
              {servicos.length === 0
                ? 'Nenhum serviço cadastrado ainda.'
                : 'Nenhum serviço encontrado para essa busca.'}
            </p>
          ) : (
            <div className="space-y-3">
              {servicosFiltrados.map((servico) => (
                <div
                  key={servico.id}
                  className="bg-zinc-950/40 border border-white/10 rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold">{servico.nome}</h3>

                    <p className="text-sm text-zinc-400">
                      R${' '}
                      {Number(servico.preco).toFixed(2).replace('.', ',')} ·{' '}
                      {servico.duracao_minutos} min
                    </p>

                    {servico.descricao && (
                      <p className="text-sm text-zinc-500 mt-2">
                        {servico.descricao}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => editarServico(servico)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Editar
                    </button>

                    {usuarioAdministrador && (
                      <button
                        onClick={() => removerServico(servico.id)}
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

export default Servicos