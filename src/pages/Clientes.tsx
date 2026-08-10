import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'

type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string | null
  observacao: string | null
  criado_em: string
}

function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteEditandoId, setClienteEditandoId] = useState<string | null>(
    null
  )

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [observacao, setObservacao] = useState('')

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

  async function buscarClientes() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao buscar clientes.')
      setCarregando(false)
      return
    }

    setClientes(data || [])
    setCarregando(false)
  }

  async function salvarCliente(event: React.FormEvent) {
    event.preventDefault()

    setMensagemErro('')

    if (!nome || !telefone) {
      setMensagemErro('Nome e telefone são obrigatórios.')
      return
    }

    try {
      setSalvando(true)

      if (clienteEditandoId) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome,
            telefone,
            email: email || null,
            observacao: observacao || null,
          })
          .eq('id', clienteEditandoId)

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao atualizar cliente.')
          return
        }

        setClienteEditandoId(null)
      } else {
        const { error } = await supabase.from('clientes').insert({
          nome,
          telefone,
          email: email || null,
          observacao: observacao || null,
        })

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao cadastrar cliente.')
          return
        }
      }

      limparFormulario()
      await buscarClientes()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao salvar cliente.')
    } finally {
      setSalvando(false)
    }
  }

  function editarCliente(cliente: Cliente) {
    setMensagemErro('')
    setClienteEditandoId(cliente.id)
    setNome(cliente.nome)
    setTelefone(cliente.telefone)
    setEmail(cliente.email || '')
    setObservacao(cliente.observacao || '')

    setTimeout(() => {
      nomeInputRef.current?.focus()
    }, 0)
  }

  function limparFormulario() {
    setClienteEditandoId(null)
    setNome('')
    setTelefone('')
    setEmail('')
    setObservacao('')
    setMensagemErro('')
  }

  async function removerCliente(id: string) {
    if (!usuarioAdministrador) {
      setMensagemErro('Apenas administradores podem remover clientes.')
      return
    }

    const confirmar = confirm('Deseja remover este cliente?')

    if (!confirmar) return

    const { error } = await supabase.from('clientes').delete().eq('id', id)

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao remover cliente.')
      return
    }

    buscarClientes()
  }

  async function carregarPermissaoUsuario() {
    const ehAdmin = await usuarioEhAdmin()
    setUsuarioAdministrador(ehAdmin)
  }

  useEffect(() => {
    buscarClientes()
    carregarPermissaoUsuario()
  }, [])

  const termoBusca = busca.trim().toLowerCase()
  const clientesFiltrados = clientes.filter((cliente) =>
    [cliente.nome, cliente.telefone, cliente.email ?? '']
      .join(' ')
      .toLowerCase()
      .includes(termoBusca)
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-ink-muted">
            Cadastre e gerencie os clientes do salão ou barbearia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => nomeInputRef.current?.focus()}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-ink px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-500/25 hover:from-violet-500 hover:to-indigo-500"
        >
          Novo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={salvarCliente}
          onKeyDown={handleEnterComoTab}
          className="bg-surface border border-line rounded-2xl shadow-lg shadow-black/5 backdrop-blur-sm p-5 space-y-4"
        >
          <h2 className="text-xl font-semibold">
            {clienteEditandoId ? 'Editar cliente' : 'Novo cliente'}
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
              placeholder="Ex: Carlos Silva"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-muted mb-1">
              Telefone *
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
              E-mail
            </label>
            <input
              type="email"
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Ex: cliente@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-muted mb-1">
              Observação
            </label>
            <textarea
              className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 min-h-24"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Ex: prefere atendimento pela manhã"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-ink px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando
              ? 'Salvando...'
              : clienteEditandoId
                ? 'Salvar alterações'
                : 'Cadastrar cliente'}
          </button>

          {clienteEditandoId && (
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
            <h2 className="text-xl font-semibold">Clientes cadastrados</h2>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-72"
            />
          </div>

          {carregando ? (
            <p className="text-ink-muted">Carregando clientes...</p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-ink-muted">
              {clientes.length === 0
                ? 'Nenhum cliente cadastrado ainda.'
                : 'Nenhum cliente encontrado para essa busca.'}
            </p>
          ) : (
            <div className="space-y-3">
              {clientesFiltrados.map((cliente) => (
                <div
                  key={cliente.id}
                  className="bg-surface-2 border border-line rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold">{cliente.nome}</h3>

                    <p className="text-sm text-ink-muted">
                      {cliente.telefone}
                    </p>

                    {cliente.email && (
                      <p className="text-sm text-ink-muted">
                        {cliente.email}
                      </p>
                    )}

                    {cliente.observacao && (
                      <p className="text-sm text-ink-subtle mt-2">
                        {cliente.observacao}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => editarCliente(cliente)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Editar
                    </button>

                    {usuarioAdministrador && (
                      <button
                        onClick={() => removerCliente(cliente.id)}
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

export default Clientes