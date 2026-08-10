import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
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
  duracao_minutos: number
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
  hora_fim: string | null
  status: string
  observacao: string | null
  clientes: Cliente | null
  profissionais: Profissional | null
  servicos: Servico | null
}

const HORA_INICIO = 7
const HORA_FIM = 21
const ALTURA_TOTAL = (HORA_FIM - HORA_INICIO) * 60

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const coresStatus: Record<string, string> = {
  agendado: 'bg-sky-500/20 text-sky-200 border-sky-500/40',
  confirmado: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
  finalizado: 'bg-violet-500/20 text-violet-200 border-violet-500/40',
  pago: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  cancelado: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  nao_compareceu: 'bg-zinc-500/20 text-ink-muted border-zinc-500/40',
}

function corStatus(status: string) {
  return coresStatus[status] ?? 'bg-zinc-500/20 text-ink-muted border-zinc-500/40'
}

function toISODate(data: Date) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function minutosDoHorario(hora: string | null) {
  if (!hora) return 0
  const [h, m] = hora.split(':')
  return Number(h) * 60 + Number(m)
}

function inicioDaSemana(data: Date) {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function adicionarDias(data: Date, dias: number) {
  const d = new Date(data)
  d.setDate(d.getDate() + dias)
  return d
}

function Agenda() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  const [clienteId, setClienteId] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [data, setData] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [observacao, setObservacao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  const [usuarioAdministrador, setUsuarioAdministrador] = useState(false)

  const [visao, setVisao] = useState<'semana' | 'lista'>('semana')
  const [semanaRef, setSemanaRef] = useState(() => new Date())
  const [selecionado, setSelecionado] = useState<Agendamento | null>(null)

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

  async function carregarDados() {
    setCarregando(true)

    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nome')
      .order('nome', { ascending: true })

    const { data: servicosData } = await supabase
      .from('servicos')
      .select('id, nome, preco, duracao_minutos')
      .order('nome', { ascending: true })

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('id, nome')
      .order('nome', { ascending: true })

    const { data: agendamentosData, error } = await supabase
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
          preco,
          duracao_minutos
        )
      `)
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao buscar agendamentos.')
    }

    setClientes(clientesData || [])
    setServicos(servicosData || [])
    setProfissionais(profissionaisData || [])
    setAgendamentos((agendamentosData as unknown as Agendamento[]) || [])

    setCarregando(false)
  }

  function limparFormulario() {
    setClienteId('')
    setServicoId('')
    setProfissionalId('')
    setData('')
    setHoraInicio('')
    setHoraFim('')
    setObservacao('')
  }

  async function cadastrarAgendamento(event: React.FormEvent) {
    event.preventDefault()
    setMensagemErro('')

    if (!clienteId || !servicoId || !profissionalId || !data || !horaInicio) {
      setMensagemErro(
        'Cliente, serviço, profissional, data e horário são obrigatórios.'
      )
      return
    }

    const servicoSelecionado = servicos.find((item) => item.id === servicoId)
    const duracao = servicoSelecionado?.duracao_minutos || 30

    const inicioNovo = minutosDoHorario(horaInicio)
    const fimNovo = horaFim ? minutosDoHorario(horaFim) : inicioNovo + duracao

    if (horaFim && fimNovo <= inicioNovo) {
      setMensagemErro('O horário de fim deve ser depois do horário de início.')
      return
    }

    const conflito = agendamentos.some((item) => {
      if (item.profissional_id !== profissionalId) return false
      if (item.data !== data) return false
      if (item.status === 'cancelado' || item.status === 'nao_compareceu') {
        return false
      }

      const ini = minutosDoHorario(item.hora_inicio)
      const fim = item.hora_fim
        ? minutosDoHorario(item.hora_fim)
        : ini + (item.servicos?.duracao_minutos || 30)

      return inicioNovo < fim && ini < fimNovo
    })

    if (conflito) {
      setMensagemErro(
        'Este profissional já tem um agendamento que conflita com esse horário.'
      )
      return
    }

    try {
      setSalvando(true)

      const { error } = await supabase.from('agendamentos').insert({
        cliente_id: clienteId,
        servico_id: servicoId,
        profissional_id: profissionalId,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim || null,
        status: 'agendado',
        observacao: observacao || null,
      })

      if (error) {
        console.error(error)
        setMensagemErro('Erro ao cadastrar agendamento.')
        return
      }

      limparFormulario()
      await carregarDados()
    } catch (error) {
      console.error(error)
      setMensagemErro('Erro inesperado ao cadastrar agendamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function removerAgendamento(agendamento: Agendamento) {
    if (agendamento.status === 'pago' && !usuarioAdministrador) {
      setMensagemErro('Este atendimento já foi pago e não pode ser removido.')
      return
    }

    const confirmar = confirm('Deseja remover este agendamento?')

    if (!confirmar) return

    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', agendamento.id)

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao remover agendamento.')
      return
    }

    setSelecionado(null)
    carregarDados()
  }

  async function alterarStatus(agendamento: Agendamento, novoStatus: string) {
    if (agendamento.status === 'pago' && !usuarioAdministrador) {
      setMensagemErro(
        'Este atendimento já foi pago e não pode ter o status alterado.'
      )
      return
    }

    const { error } = await supabase
      .from('agendamentos')
      .update({ status: novoStatus })
      .eq('id', agendamento.id)

    if (error) {
      console.error(error)
      setMensagemErro('Erro ao alterar status.')
      return
    }

    setSelecionado((atual) =>
      atual ? { ...atual, status: novoStatus } : atual
    )
    carregarDados()
  }

  async function carregarPermissaoUsuario() {
    const ehAdmin = await usuarioEhAdmin()
    setUsuarioAdministrador(ehAdmin)
  }

  useEffect(() => {
    carregarDados()
    carregarPermissaoUsuario()
  }, [])

  const inicioSemana = inicioDaSemana(semanaRef)
  const diasSemana = Array.from({ length: 7 }, (_, i) =>
    adicionarDias(inicioSemana, i)
  )
  const fimSemana = diasSemana[6]
  const horas = Array.from(
    { length: HORA_FIM - HORA_INICIO },
    (_, i) => HORA_INICIO + i
  )
  const isoHoje = toISODate(new Date())

  function agendamentosDoDia(dia: Date) {
    const iso = toISODate(dia)
    return agendamentos.filter((item) => item.data === iso)
  }

  function selecionarDia(dia: Date) {
    setData(toISODate(dia))
  }

  function rotuloIntervaloSemana() {
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(
        d.getMonth() + 1
      ).padStart(2, '0')}`
    return `${fmt(inicioSemana)} – ${fmt(fimSemana)}`
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-ink-muted">Controle os horários e atendimentos.</p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setVisao('semana')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              visao === 'semana'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-ink'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setVisao('lista')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              visao === 'lista'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-ink'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          id="form-agendamento"
          onSubmit={cadastrarAgendamento}
          onKeyDown={handleEnterComoTab}
          className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm"
        >
          <h2 className="text-xl font-semibold">Novo agendamento</h2>

          {mensagemErro && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-300">
              {mensagemErro}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-ink-muted">Cliente *</label>
            <select
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={clienteId}
              onChange={(event) => setClienteId(event.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">Serviço *</label>
            <select
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={servicoId}
              onChange={(event) => setServicoId(event.target.value)}
            >
              <option value="">Selecione um serviço</option>
              {servicos.map((servico) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome} - R${' '}
                  {Number(servico.preco).toFixed(2).replace('.', ',')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">
              Profissional *
            </label>
            <select
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={profissionalId}
              onChange={(event) => setProfissionalId(event.target.value)}
            >
              <option value="">Selecione um profissional</option>
              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">Data *</label>
            <input
              type="date"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={data}
              onChange={(event) => setData(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-ink-muted">Início *</label>
              <input
                type="time"
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={horaInicio}
                onChange={(event) => setHoraInicio(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-ink-muted">Fim</label>
              <input
                type="time"
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                value={horaFim}
                onChange={(event) => setHoraFim(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">Observação</label>
            <textarea
              className="min-h-24 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              placeholder="Ex: cliente pediu preferência por horário da manhã"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 font-semibold text-ink shadow-lg shadow-indigo-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar agendamento'}
          </button>

          <p className="text-xs text-ink-subtle">
            Dica: clique em um dia no calendário para preencher a data
            automaticamente.
          </p>
        </form>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/5 backdrop-blur-sm lg:col-span-2">
          {visao === 'semana' ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  {rotuloIntervaloSemana()}
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSemanaRef(adicionarDias(semanaRef, -7))}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setSemanaRef(new Date())}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setSemanaRef(adicionarDias(semanaRef, 7))}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
                  >
                    ›
                  </button>
                </div>
              </div>

              {carregando ? (
                <p className="text-ink-muted">Carregando agenda...</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
                    >
                      <div />
                      {diasSemana.map((dia) => {
                        const iso = toISODate(dia)
                        const ehHoje = iso === isoHoje
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => selecionarDia(dia)}
                            className={`mb-1 rounded-lg py-1 text-center ${
                              ehHoje
                                ? 'bg-violet-500/20 text-violet-200'
                                : 'text-ink-muted hover:bg-elevated'
                            }`}
                          >
                            <div className="text-xs">
                              {NOMES_DIAS[dia.getDay()]}
                            </div>
                            <div className="text-sm font-semibold">
                              {dia.getDate()}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div
                      className="grid"
                      style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
                    >
                      <div className="relative" style={{ height: ALTURA_TOTAL }}>
                        {horas.map((h) => (
                          <div
                            key={h}
                            className="absolute right-2 text-xs text-ink-subtle"
                            style={{ top: (h - HORA_INICIO) * 60 - 6 }}
                          >
                            {String(h).padStart(2, '0')}:00
                          </div>
                        ))}
                      </div>

                      {diasSemana.map((dia) => {
                        const iso = toISODate(dia)
                        return (
                          <div
                            key={iso}
                            onClick={() => selecionarDia(dia)}
                            className="relative border-l border-line"
                            style={{ height: ALTURA_TOTAL }}
                          >
                            {horas.map((h) => (
                              <div
                                key={h}
                                className="absolute inset-x-0 border-t border-line"
                                style={{ top: (h - HORA_INICIO) * 60 }}
                              />
                            ))}

                            {agendamentosDoDia(dia).map((item) => {
                              const inicio = minutosDoHorario(item.hora_inicio)
                              const dur = item.hora_fim
                                ? minutosDoHorario(item.hora_fim) - inicio
                                : item.servicos?.duracao_minutos || 30
                              const top = Math.max(inicio - HORA_INICIO * 60, 0)
                              const altura = Math.max(dur, 22)

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelecionado(item)
                                  }}
                                  className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight ${corStatus(
                                    item.status
                                  )}`}
                                  style={{ top, height: altura }}
                                  title={`${item.clientes?.nome ?? ''} · ${
                                    item.servicos?.nome ?? ''
                                  }`}
                                >
                                  <div className="font-semibold">
                                    {item.hora_inicio?.slice(0, 5)}
                                  </div>
                                  <div className="truncate">
                                    {item.clientes?.nome || 'Cliente'}
                                  </div>
                                  <div className="truncate opacity-80">
                                    {item.servicos?.nome || 'Serviço'}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="mb-4 text-xl font-semibold">Agendamentos</h2>

              {carregando ? (
                <p className="text-ink-muted">Carregando agendamentos...</p>
              ) : agendamentos.length === 0 ? (
                <p className="text-ink-muted">
                  Nenhum agendamento cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {agendamentos.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="rounded-lg border border-line bg-surface-2 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">
                            {agendamento.clientes?.nome || 'Cliente removido'}
                          </h3>

                          <p className="text-xs text-ink-subtle">
                            Atendimento #{agendamento.id.slice(0, 8)}
                          </p>

                          <p className="text-sm text-ink-muted">
                            {agendamento.servicos?.nome || 'Serviço removido'} ·{' '}
                            {agendamento.profissionais?.nome ||
                              'Profissional removido'}
                          </p>

                          <p className="text-sm text-ink-muted">
                            {agendamento.data} · {agendamento.hora_inicio}
                            {agendamento.hora_fim
                              ? ` até ${agendamento.hora_fim}`
                              : ''}
                          </p>

                          {agendamento.observacao && (
                            <p className="mt-2 text-sm text-ink-subtle">
                              {agendamento.observacao}
                            </p>
                          )}
                        </div>

                        {(agendamento.status !== 'pago' ||
                          usuarioAdministrador) && (
                          <button
                            onClick={() => removerAgendamento(agendamento)}
                            className="text-sm text-rose-400 hover:text-rose-300"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm text-ink-muted">Status:</span>

                        <select
                          className="rounded-lg border border-line bg-surface-2 px-3 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={agendamento.status}
                          disabled={
                            agendamento.status === 'pago' &&
                            !usuarioAdministrador
                          }
                          onChange={(event) =>
                            alterarStatus(agendamento, event.target.value)
                          }
                        >
                          <option value="agendado">Agendado</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="finalizado">Finalizado</option>
                          <option value="pago">Pago</option>
                          <option value="cancelado">Cancelado</option>
                          <option value="nao_compareceu">Não compareceu</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selecionado && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelecionado(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-line bg-surface-solid p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.32 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {selecionado.clientes?.nome || 'Cliente removido'}
                </h3>
                <p className="text-sm text-ink-muted">
                  {selecionado.servicos?.nome || 'Serviço removido'} ·{' '}
                  {selecionado.profissionais?.nome || 'Profissional removido'}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${corStatus(
                  selecionado.status
                )}`}
              >
                {selecionado.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-sm text-ink-muted">
              {selecionado.data} · {selecionado.hora_inicio?.slice(0, 5)}
              {selecionado.hora_fim
                ? ` até ${selecionado.hora_fim.slice(0, 5)}`
                : ''}
            </p>

            {selecionado.observacao && (
              <p className="mt-2 text-sm text-ink-subtle">
                {selecionado.observacao}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <span className="text-sm text-ink-muted">Status:</span>
              <select
                className="rounded-lg border border-line bg-surface-2 px-3 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={selecionado.status}
                disabled={
                  selecionado.status === 'pago' && !usuarioAdministrador
                }
                onChange={(event) =>
                  alterarStatus(selecionado, event.target.value)
                }
              >
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="finalizado">Finalizado</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
                <option value="nao_compareceu">Não compareceu</option>
              </select>
            </div>

            <div className="mt-6 flex justify-between">
              {selecionado.status !== 'pago' || usuarioAdministrador ? (
                <button
                  type="button"
                  onClick={() => removerAgendamento(selecionado)}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
                >
                  Remover
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={() => setSelecionado(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink-muted hover:bg-elevated hover:text-ink"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  )
}

export default Agenda
