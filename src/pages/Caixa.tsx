import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'

type Cliente = {
  id: string
  nome: string
}

type Servico = {
  id: string
  nome: string
  preco: number
}

type Profissional = {
  id: string
  nome: string
}

type Agendamento = {
  id: string
  cliente_id: string | null
  profissional_id: string | null
  servico_id: string | null
  data: string
  hora_inicio: string
  status: string
  clientes: Cliente | null
  profissionais: Profissional | null
  servicos: Servico | null
}

type Venda = {
  id: string
  agendamento_id: string | null
  valor_total: number
  status: string
  criado_em: string
  clientes: Cliente | null
  profissionais: Profissional | null
  servicos: Servico | null
  pagamentos: {
    forma_pagamento: string
    valor: number
  }[]
}

function Caixa() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [agendamentoId, setAgendamentoId] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [carregando, setCarregando] = useState(false)
  const [usuarioAdministrador, setUsuarioAdministrador] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [caixaFechado, setCaixaFechado] = useState(false)
  const [fechando, setFechando] = useState(false)

  function obterDataHojeISO() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
  }

  const [dataFiltro, setDataFiltro] = useState(() => obterDataHojeISO())

  async function carregarDados() {
    setCarregando(true)
    setMensagem('')

    const { data: agendamentosData, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select(`
        *,
        clientes (
          id,
          nome
        ),
        profissionais (
          id,
          nome
        ),
        servicos (
          id,
          nome,
          preco
        )
      `)
      .eq('status', 'finalizado')
      .order('data', { ascending: false })

    if (agendamentosError) {
      console.error(agendamentosError)
      setMensagem('Erro ao buscar agendamentos finalizados.')
    }

    const dataSelecionada = dataFiltro || obterDataHojeISO()
    const inicioDoDia = `${dataSelecionada}T00:00:00`
    const fimDoDia = `${dataSelecionada}T23:59:59`

    const { data: vendasData, error: vendasError } = await supabase
      .from('vendas')
      .select(`
        *,
        clientes (
          id,
          nome
        ),
        profissionais (
          id,
          nome
        ),
        servicos (
          id,
          nome,
          preco
        ),
        pagamentos (
          forma_pagamento,
          valor
        )
      `)
      .gte('criado_em', inicioDoDia)
      .lte('criado_em', fimDoDia)
      .order('criado_em', { ascending: false })

    if (vendasError) {
      console.error(vendasError)
      setMensagem('Erro ao buscar vendas.')
    }

    const { data: fechamentoData, error: fechamentoError } = await supabase
      .from('fechamentos_caixa')
      .select('id')
      .eq('data', dataSelecionada)
      .maybeSingle()

    if (fechamentoError) {
      console.error(fechamentoError)
    }

    setAgendamentos((agendamentosData as unknown as Agendamento[]) || [])
    setVendas((vendasData as unknown as Venda[]) || [])
    setCaixaFechado(!!fechamentoData)

    setCarregando(false)
  }

  async function registrarVenda(event: React.FormEvent) {
    event.preventDefault()
    setMensagem('')

    if (caixaFechado) {
      setMensagem(
        'O caixa desta data está fechado. Não é possível registrar vendas.'
      )
      return
    }

    if (!agendamentoId) {
      setMensagem('Selecione um agendamento finalizado.')
      return
    }

    const agendamento = agendamentos.find((item) => item.id === agendamentoId)

    if (!agendamento) {
      setMensagem('Agendamento não encontrado.')
      return
    }

    if (!agendamento.servicos) {
      setMensagem('Este agendamento não possui serviço vinculado.')
      return
    }

    const valorTotal = Number(agendamento.servicos.preco)

    const { data: vendaData, error: vendaError } = await supabase
      .from('vendas')
      .insert({
        agendamento_id: agendamento.id,
        cliente_id: agendamento.cliente_id,
        profissional_id: agendamento.profissional_id,
        servico_id: agendamento.servico_id,
        valor_total: valorTotal,
        status: 'pago',
      })
      .select()
      .single()

    if (vendaError) {
      console.error(vendaError)
      setMensagem('Erro ao registrar venda.')
      return
    }

    const { error: pagamentoError } = await supabase.from('pagamentos').insert({
      venda_id: vendaData.id,
      forma_pagamento: formaPagamento,
      valor: valorTotal,
    })

    if (pagamentoError) {
      console.error(pagamentoError)
      setMensagem('Venda criada, mas houve erro ao registrar o pagamento.')
      return
    }

    const { error: agendamentoError } = await supabase
      .from('agendamentos')
      .update({ status: 'pago' })
      .eq('id', agendamento.id)

    if (agendamentoError) {
      console.error(agendamentoError)
      setMensagem('Pagamento registrado, mas houve erro ao atualizar o status.')
      return
    }

    setAgendamentoId('')
    setFormaPagamento('pix')

    carregarDados()
  }

  async function removerVenda(id: string) {
    if (!usuarioAdministrador) {
      setMensagem('Apenas administradores podem remover vendas.')
      return
    }

    if (caixaFechado) {
      setMensagem(
        'O caixa desta data está fechado. Não é possível remover vendas.'
      )
      return
    }

    const confirmar = confirm('Deseja remover esta venda?')

    if (!confirmar) return

    const { error } = await supabase.from('vendas').delete().eq('id', id)

    if (error) {
      console.error(error)
      setMensagem('Erro ao remover venda.')
      return
    }

    carregarDados()
  }

  async function fecharCaixa() {
    if (!usuarioAdministrador) {
      setMensagem('Apenas administradores podem fechar o caixa.')
      return
    }

    const confirmar = confirm(
      `Fechar o caixa de ${dataFiltro}? Depois de fechado, não será possível registrar ou remover vendas nesta data.`
    )

    if (!confirmar) return

    try {
      setFechando(true)

      const { error } = await supabase.from('fechamentos_caixa').insert({
        data: dataFiltro,
        total: totalDoCaixa,
      })

      if (error) {
        console.error(error)
        setMensagem('Erro ao fechar o caixa.')
        return
      }

      await carregarDados()
    } catch (error) {
      console.error(error)
      setMensagem('Erro inesperado ao fechar o caixa.')
    } finally {
      setFechando(false)
    }
  }

  async function reabrirCaixa() {
    if (!usuarioAdministrador) {
      setMensagem('Apenas administradores podem reabrir o caixa.')
      return
    }

    const confirmar = confirm(`Reabrir o caixa de ${dataFiltro}?`)

    if (!confirmar) return

    try {
      setFechando(true)

      const { error } = await supabase
        .from('fechamentos_caixa')
        .delete()
        .eq('data', dataFiltro)

      if (error) {
        console.error(error)
        setMensagem('Erro ao reabrir o caixa.')
        return
      }

      await carregarDados()
    } catch (error) {
      console.error(error)
      setMensagem('Erro inesperado ao reabrir o caixa.')
    } finally {
      setFechando(false)
    }
  }

  const totalDoCaixa = vendas.reduce((total, venda) => {
    return total + Number(venda.valor_total)
  }, 0)

  async function carregarPermissaoUsuario() {
    const ehAdmin = await usuarioEhAdmin()
    setUsuarioAdministrador(ehAdmin)
  }

  useEffect(() => {
    carregarDados()
    carregarPermissaoUsuario()
  }, [dataFiltro])

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Caixa</h1>
          <p className="text-ink-muted">
            Registre pagamentos e acompanhe as vendas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-line bg-surface px-5 py-3 backdrop-blur-sm">
            <p className="text-sm text-ink-muted">Caixa da data</p>
            <strong className="text-2xl">
              R$ {totalDoCaixa.toFixed(2).replace('.', ',')}
            </strong>
          </div>

          <div className="rounded-xl border border-line bg-surface px-5 py-3 backdrop-blur-sm">
            <label className="mb-1 block text-sm text-ink-muted">
              Data do caixa
            </label>
            <input
              type="date"
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={dataFiltro}
              onChange={(event) => setDataFiltro(event.target.value)}
            />
          </div>

          {usuarioAdministrador && (
            <div className="rounded-xl border border-line bg-surface px-5 py-3 backdrop-blur-sm">
              <p className="mb-1 text-sm text-ink-muted">Fechamento</p>
              {caixaFechado ? (
                <button
                  type="button"
                  onClick={reabrirCaixa}
                  disabled={fechando}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-elevated hover:text-ink disabled:opacity-50"
                >
                  Reabrir caixa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={fecharCaixa}
                  disabled={fechando || vendas.length === 0}
                  className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-sm font-semibold text-ink shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Fechar caixa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {caixaFechado && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Caixa do dia {dataFiltro} está fechado. Vendas bloqueadas para esta
          data.
        </div>
      )}

      {mensagem && (
        <div className="mb-4 rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-2 text-sm text-rose-300">
          {mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={registrarVenda}
          className={`space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm ${
            caixaFechado ? 'opacity-60' : ''
          }`}
        >
          <h2 className="text-xl font-semibold">Registrar venda</h2>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">
              Agendamento finalizado *
            </label>
            <select
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed"
              value={agendamentoId}
              disabled={caixaFechado}
              onChange={(event) => setAgendamentoId(event.target.value)}
            >
              <option value="">Selecione um agendamento</option>

              {agendamentos.map((agendamento) => (
                <option key={agendamento.id} value={agendamento.id}>
                  #{agendamento.id.slice(0, 8)} -{' '}
                  {agendamento.clientes?.nome || 'Cliente removido'} -{' '}
                  {agendamento.servicos?.nome || 'Serviço removido'} - R${' '}
                  {Number(agendamento.servicos?.preco || 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">
              Forma de pagamento *
            </label>
            <select
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed"
              value={formaPagamento}
              disabled={caixaFechado}
              onChange={(event) => setFormaPagamento(event.target.value)}
            >
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={caixaFechado}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 font-semibold text-ink shadow-lg shadow-indigo-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Registrar pagamento
          </button>

          <p className="text-sm text-ink-subtle">
            Apenas agendamentos com status finalizado aparecem aqui.
          </p>
        </form>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">
            Vendas do dia {dataFiltro}
          </h2>

          {carregando ? (
            <p className="text-ink-muted">Carregando vendas...</p>
          ) : vendas.length === 0 ? (
            <p className="text-ink-muted">Nenhuma venda registrada nesta data.</p>
          ) : (
            <div className="space-y-3">
              {vendas.map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface-2 p-4"
                >
                  <div>
                    <h3 className="font-semibold">
                      {venda.clientes?.nome || 'Cliente removido'}
                    </h3>

                    {venda.agendamento_id && (
                      <p className="text-xs text-ink-subtle">
                        Atendimento #{venda.agendamento_id.slice(0, 8)}
                      </p>
                    )}

                    <p className="text-sm text-ink-muted">
                      {venda.servicos?.nome || 'Serviço removido'} ·{' '}
                      {venda.profissionais?.nome || 'Profissional removido'}
                    </p>

                    <p className="text-sm text-ink-muted">
                      R$ {Number(venda.valor_total).toFixed(2).replace('.', ',')}
                    </p>

                    {venda.pagamentos?.[0] && (
                      <p className="mt-1 text-sm text-ink-subtle">
                        Pagamento: {venda.pagamentos[0].forma_pagamento}
                      </p>
                    )}
                  </div>

                  {usuarioAdministrador && !caixaFechado && (
                    <button
                      onClick={() => removerVenda(venda.id)}
                      className="text-sm text-rose-400 hover:text-rose-300"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Caixa
