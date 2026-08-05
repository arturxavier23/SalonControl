import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../services/supabase'
import { usuarioEhAdmin } from '../services/auth'

type Agendamento = {
  id: string
  data: string
  hora_inicio: string
  status: string
  clientes: {
    nome: string
  } | null
  servicos: {
    nome: string
  } | null
  profissionais: {
    nome: string
  } | null
}

type Venda = {
  valor_total: number
}

const coresStatus: Record<string, string> = {
  agendado: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  confirmado: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  finalizado: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  pago: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  cancelado: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  nao_compareceu: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30',
}

function badgeStatus(status: string) {
  return coresStatus[status] ?? 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30'
}

type Indicador = {
  titulo: string
  valor: string
  cor: string
  icone: React.ReactNode
}

function Dashboard() {
  const [totalClientes, setTotalClientes] = useState(0)
  const [totalServicos, setTotalServicos] = useState(0)
  const [totalProfissionais, setTotalProfissionais] = useState(0)
  const [agendamentosHoje, setAgendamentosHoje] = useState(0)
  const [totalCaixa, setTotalCaixa] = useState(0)
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState(0)
  const [ultimosAgendamentos, setUltimosAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salaoNome, setSalaoNome] = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [ehAdmin, setEhAdmin] = useState(false)

  function obterDataHoje() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
  }

  async function carregarDashboard() {
    setCarregando(true)

    try {
      const hoje = obterDataHoje()

      const { data: salaoData } = await supabase
        .from('saloes')
        .select('nome, codigo_convite')
        .maybeSingle()

      if (salaoData) {
        setSalaoNome(salaoData.nome)
        setCodigoConvite(salaoData.codigo_convite)
      }

      setEhAdmin(await usuarioEhAdmin())

      const { count: clientesCount, error: clientesError } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })

      if (clientesError) {
        console.error(clientesError)
      }

      const { count: servicosCount, error: servicosError } = await supabase
        .from('servicos')
        .select('*', { count: 'exact', head: true })

      if (servicosError) {
        console.error(servicosError)
      }

      const { count: profissionaisCount, error: profissionaisError } =
        await supabase
          .from('profissionais')
          .select('*', { count: 'exact', head: true })

      if (profissionaisError) {
        console.error(profissionaisError)
      }

      const { count: agendamentosHojeCount, error: agendamentosHojeError } =
        await supabase
          .from('agendamentos')
          .select('*', { count: 'exact', head: true })
          .eq('data', hoje)

      if (agendamentosHojeError) {
        console.error(agendamentosHojeError)
      }

      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas')
        .select('valor_total')

      if (vendasError) {
        console.error(vendasError)
      }

      const totalVendido = (vendasData || []).reduce((total, venda: Venda) => {
        return total + Number(venda.valor_total)
      }, 0)

      const { data: produtosBaixoData, error: produtosBaixoError } =
        await supabase
          .from('produtos')
          .select('id, quantidade, estoque_minimo')

      if (produtosBaixoError) {
        console.error(produtosBaixoError)
      }

      const quantidadeProdutosBaixo = (produtosBaixoData || []).filter(
        (produto) => {
          return Number(produto.quantidade) <= Number(produto.estoque_minimo)
        }
      ).length

      const { data: agendamentosData, error: agendamentosError } =
        await supabase
          .from('agendamentos')
          .select(`
            id,
            data,
            hora_inicio,
            status,
            clientes (
              nome
            ),
            servicos (
              nome
            ),
            profissionais (
              nome
            )
          `)
          .order('data', { ascending: false })
          .order('hora_inicio', { ascending: false })
          .limit(5)

      if (agendamentosError) {
        console.error(agendamentosError)
      }

      setTotalClientes(clientesCount || 0)
      setTotalServicos(servicosCount || 0)
      setTotalProfissionais(profissionaisCount || 0)
      setAgendamentosHoje(agendamentosHojeCount || 0)
      setTotalCaixa(totalVendido)
      setProdutosEstoqueBaixo(quantidadeProdutosBaixo)
      setUltimosAgendamentos(
        (agendamentosData as unknown as Agendamento[]) || []
      )
    } catch (error) {
      console.error('Erro inesperado no dashboard:', error)
      alert('Erro ao carregar dashboard. Veja o console.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDashboard()
  }, [])

  const indicadores: Indicador[] = [
    {
      titulo: 'Clientes',
      valor: String(totalClientes),
      cor: 'from-violet-500/20 text-violet-300',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
    },
    {
      titulo: 'Serviços',
      valor: String(totalServicos),
      cor: 'from-indigo-500/20 text-indigo-300',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
        </svg>
      ),
    },
    {
      titulo: 'Profissionais',
      valor: String(totalProfissionais),
      cor: 'from-sky-500/20 text-sky-300',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      titulo: 'Agendamentos hoje',
      valor: String(agendamentosHoje),
      cor: 'from-amber-500/20 text-amber-300',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      titulo: 'Total em caixa',
      valor: `R$ ${totalCaixa.toFixed(2).replace('.', ',')}`,
      cor: 'from-emerald-500/20 text-emerald-300',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      titulo: 'Estoque baixo',
      valor: String(produtosEstoqueBaixo),
      cor: 'from-rose-500/20 text-rose-300',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ]

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-400">Visão geral do salão ou barbearia.</p>
        </div>

        <button
          type="button"
          onClick={carregarDashboard}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Atualizar
        </button>
      </div>

      {carregando ? (
        <p className="text-zinc-400">Carregando dados...</p>
      ) : (
        <>
          {(salaoNome || codigoConvite) && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Salão</p>
                <strong className="text-lg">{salaoNome || '—'}</strong>
              </div>

              {ehAdmin && codigoConvite && (
                <div className="sm:text-right">
                  <p className="text-sm text-zinc-400">
                    Código de convite da equipe
                  </p>
                  <span className="font-mono text-lg tracking-widest text-violet-300">
                    {codigoConvite}
                  </span>
                  <p className="text-xs text-zinc-500">
                    Compartilhe com seus funcionários para eles entrarem.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {indicadores.map((indicador) => (
              <div
                key={indicador.titulo}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-sm transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">{indicador.titulo}</p>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br to-transparent ${indicador.cor}`}
                  >
                    {indicador.icone}
                  </div>
                </div>
                <strong className="mt-2 block text-3xl">{indicador.valor}</strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-semibold">Últimos agendamentos</h2>

            {ultimosAgendamentos.length === 0 ? (
              <p className="text-zinc-400">Nenhum agendamento encontrado.</p>
            ) : (
              <div className="space-y-3">
                {ultimosAgendamentos.map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4 transition hover:border-white/20"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {agendamento.clientes?.nome || 'Cliente removido'}
                      </h3>

                      <p className="text-xs text-zinc-500">
                        Atendimento #{agendamento.id.slice(0, 8)}
                      </p>

                      <p className="text-sm text-zinc-400">
                        {agendamento.servicos?.nome || 'Serviço removido'} ·{' '}
                        {agendamento.profissionais?.nome ||
                          'Profissional removido'}
                      </p>

                      <p className="text-sm text-zinc-500">
                        {agendamento.data} · {agendamento.hora_inicio}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset ${badgeStatus(
                        agendamento.status
                      )}`}
                    >
                      {agendamento.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}

export default Dashboard
