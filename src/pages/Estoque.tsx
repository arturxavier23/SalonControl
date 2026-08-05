import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'

type Produto = {
  id: string
  nome: string
  categoria: string | null
  tipo: string
  quantidade: number
  estoque_minimo: number
  custo_unitario: number
  preco_venda: number | null
  ativo: boolean
  criado_em: string
}

function Estoque() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoEditandoId, setProdutoEditandoId] = useState<string | null>(
    null
  )

  const [produtoId, setProdutoId] = useState('')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [tipo, setTipo] = useState('uso_interno')
  const [quantidade, setQuantidade] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')

  const [quantidadeMovimento, setQuantidadeMovimento] = useState('')
  const [tipoMovimento, setTipoMovimento] = useState('entrada')
  const [observacaoMovimento, setObservacaoMovimento] = useState('')

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

  async function buscarProdutos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao buscar produtos.')
      setCarregando(false)
      return
    }

    setProdutos(data || [])
    setCarregando(false)
  }

  async function salvarProduto(event: React.FormEvent) {
    event.preventDefault()

    setMensagemErro('')

    if (!nome) {
      setMensagemErro('Nome do produto é obrigatório.')
      return
    }

    try {
      setSalvando(true)

      if (produtoEditandoId) {
        const { error } = await supabase
          .from('produtos')
          .update({
            nome,
            categoria: categoria || null,
            tipo,
            quantidade: Number(quantidade || 0),
            estoque_minimo: Number(estoqueMinimo || 0),
            custo_unitario: Number(custoUnitario || 0),
            preco_venda: precoVenda ? Number(precoVenda) : null,
          })
          .eq('id', produtoEditandoId)

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao atualizar produto.')
          return
        }

        setProdutoEditandoId(null)
      } else {
        const { error } = await supabase.from('produtos').insert({
          nome,
          categoria: categoria || null,
          tipo,
          quantidade: Number(quantidade || 0),
          estoque_minimo: Number(estoqueMinimo || 0),
          custo_unitario: Number(custoUnitario || 0),
          preco_venda: precoVenda ? Number(precoVenda) : null,
          ativo: true,
        })

        if (error) {
          console.error(error)
          setMensagemErro('Erro ao cadastrar produto.')
          return
        }
      }

      limparFormularioProduto()
      await buscarProdutos()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao salvar produto.')
    } finally {
      setSalvando(false)
    }
  }

  function editarProduto(produto: Produto) {
    setMensagemErro('')
    setProdutoEditandoId(produto.id)
    setNome(produto.nome)
    setCategoria(produto.categoria || '')
    setTipo(produto.tipo)
    setQuantidade(String(produto.quantidade))
    setEstoqueMinimo(String(produto.estoque_minimo))
    setCustoUnitario(String(produto.custo_unitario))
    setPrecoVenda(produto.preco_venda !== null ? String(produto.preco_venda) : '')

    setTimeout(() => {
      nomeInputRef.current?.focus()
    }, 0)
  }

  function limparFormularioProduto() {
    setProdutoEditandoId(null)
    setNome('')
    setCategoria('')
    setTipo('uso_interno')
    setQuantidade('')
    setEstoqueMinimo('')
    setCustoUnitario('')
    setPrecoVenda('')
    setMensagemErro('')
  }

  async function registrarMovimento(event: React.FormEvent) {
    event.preventDefault()

    setMensagemErro('')

    if (!produtoId || !quantidadeMovimento) {
      setMensagemErro('Produto e quantidade são obrigatórios.')
      return
    }

    const produto = produtos.find((item) => item.id === produtoId)

    if (!produto) {
      setMensagemErro('Produto não encontrado.')
      return
    }

    const quantidadeInformada = Number(quantidadeMovimento)

    if (quantidadeInformada <= 0) {
      setMensagemErro('A quantidade deve ser maior que zero.')
      return
    }

    const novaQuantidade =
      tipoMovimento === 'entrada'
        ? produto.quantidade + quantidadeInformada
        : produto.quantidade - quantidadeInformada

    if (novaQuantidade < 0) {
      setMensagemErro('Estoque insuficiente para esta saída.')
      return
    }

    try {
      setSalvando(true)

      const { error: movimentoError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          produto_id: produtoId,
          tipo: tipoMovimento,
          quantidade: quantidadeInformada,
          observacao: observacaoMovimento || null,
        })

      if (movimentoError) {
        console.error(movimentoError)
        setMensagemErro('Erro ao registrar movimentação.')
        return
      }

      const { error: produtoError } = await supabase
        .from('produtos')
        .update({ quantidade: novaQuantidade })
        .eq('id', produtoId)

      if (produtoError) {
        console.error(produtoError)
        setMensagemErro('Movimentação criada, mas erro ao atualizar estoque.')
        return
      }

      setProdutoId('')
      setTipoMovimento('entrada')
      setQuantidadeMovimento('')
      setObservacaoMovimento('')

      await buscarProdutos()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao movimentar estoque.')
    } finally {
      setSalvando(false)
    }
  }

  async function removerProduto(id: string) {
    if (!usuarioAdministrador) {
      setMensagemErro('Apenas administradores podem remover produtos.')
      return
    }

    const confirmar = confirm('Deseja remover este produto?')

    if (!confirmar) return

    const { error } = await supabase.from('produtos').delete().eq('id', id)

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao remover produto.')
      return
    }

    buscarProdutos()
  }

  async function carregarPermissaoUsuario() {
    const ehAdmin = await usuarioEhAdmin()
    setUsuarioAdministrador(ehAdmin)
  }

  useEffect(() => {
    buscarProdutos()
    carregarPermissaoUsuario()
  }, [])

  const termoBusca = busca.trim().toLowerCase()
  const produtosFiltrados = produtos.filter((produto) =>
    [produto.nome, produto.categoria ?? '']
      .join(' ')
      .toLowerCase()
      .includes(termoBusca)
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-zinc-400">
            Controle produtos, entradas, saídas e estoque mínimo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => nomeInputRef.current?.focus()}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-950/40 hover:from-violet-500 hover:to-indigo-500"
        >
          Novo produto
        </button>
      </div>

      {mensagemErro && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-3 py-2 text-sm mb-6">
          {mensagemErro}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6">
          <form
            onSubmit={salvarProduto}
            onKeyDown={handleEnterComoTab}
            className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 backdrop-blur-sm p-5 space-y-4"
          >
            <h2 className="text-xl font-semibold">
              {produtoEditandoId ? 'Editar produto' : 'Novo produto'}
            </h2>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Nome *
              </label>
              <input
                ref={nomeInputRef}
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex: Pomada modeladora"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Categoria
              </label>
              <input
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                placeholder="Ex: Finalizador"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Tipo
              </label>
              <select
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
              >
                <option value="uso_interno">Uso interno</option>
                <option value="revenda">Revenda</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  value={quantidade}
                  onChange={(event) => setQuantidade(event.target.value)}
                  placeholder="Ex: 10"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Estoque mínimo
                </label>
                <input
                  type="number"
                  className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  value={estoqueMinimo}
                  onChange={(event) => setEstoqueMinimo(event.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Custo
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  value={custoUnitario}
                  onChange={(event) => setCustoUnitario(event.target.value)}
                  placeholder="Ex: 18"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Preço venda
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  value={precoVenda}
                  onChange={(event) => setPrecoVenda(event.target.value)}
                  placeholder="Ex: 35"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-950/40 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando
                ? 'Salvando...'
                : produtoEditandoId
                  ? 'Salvar alterações'
                  : 'Cadastrar produto'}
            </button>

            {produtoEditandoId && (
              <button
                type="button"
                onClick={limparFormularioProduto}
                className="w-full border border-white/15 text-zinc-300 hover:bg-white/5 hover:text-white px-4 py-2 rounded-lg font-medium"
              >
                Cancelar edição
              </button>
            )}
          </form>

          <form
            onSubmit={registrarMovimento}
            onKeyDown={handleEnterComoTab}
            className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 backdrop-blur-sm p-5 space-y-4"
          >
            <h2 className="text-xl font-semibold">Movimentar estoque</h2>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Produto *
              </label>
              <select
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={produtoId}
                onChange={(event) => setProdutoId(event.target.value)}
              >
                <option value="">Selecione um produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} — atual: {produto.quantidade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Tipo de movimento
              </label>
              <select
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={tipoMovimento}
                onChange={(event) => setTipoMovimento(event.target.value)}
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={quantidadeMovimento}
                onChange={(event) => setQuantidadeMovimento(event.target.value)}
                placeholder="Ex: 5"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Observação
              </label>
              <textarea
                className="w-full bg-zinc-950/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 min-h-20"
                value={observacaoMovimento}
                onChange={(event) => setObservacaoMovimento(event.target.value)}
                placeholder="Ex: Compra de reposição"
              />
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg shadow-indigo-950/40 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? 'Registrando...' : 'Registrar movimento'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/20 backdrop-blur-sm p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Produtos cadastrados</h2>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-64"
            />
          </div>

          {carregando ? (
            <p className="text-zinc-400">Carregando produtos...</p>
          ) : produtosFiltrados.length === 0 ? (
            <p className="text-zinc-400">
              {produtos.length === 0
                ? 'Nenhum produto cadastrado ainda.'
                : 'Nenhum produto encontrado para essa busca.'}
            </p>
          ) : (
            <div className="space-y-3">
              {produtosFiltrados.map((produto) => {
                const estoqueBaixo =
                  produto.quantidade <= produto.estoque_minimo

                return (
                  <div
                    key={produto.id}
                    className="bg-zinc-950/40 border border-white/10 rounded-lg p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{produto.nome}</h3>

                        {estoqueBaixo && (
                          <span className="text-xs bg-red-950 text-red-300 border border-red-800 px-2 py-1 rounded-full">
                            Estoque baixo
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-zinc-400">
                        {produto.categoria || 'Sem categoria'} ·{' '}
                        {produto.tipo === 'revenda'
                          ? 'Revenda'
                          : 'Uso interno'}
                      </p>

                      <p className="text-sm text-zinc-400">
                        Quantidade: {produto.quantidade} · Mínimo:{' '}
                        {produto.estoque_minimo}
                      </p>

                      <p className="text-sm text-zinc-500 mt-1">
                        Custo: R${' '}
                        {Number(produto.custo_unitario)
                          .toFixed(2)
                          .replace('.', ',')}
                        {produto.preco_venda !== null &&
                          ` · Venda: R$ ${Number(produto.preco_venda)
                            .toFixed(2)
                            .replace('.', ',')}`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => editarProduto(produto)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Editar
                      </button>

                      {usuarioAdministrador && (
                        <button
                          onClick={() => removerProduto(produto.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Estoque