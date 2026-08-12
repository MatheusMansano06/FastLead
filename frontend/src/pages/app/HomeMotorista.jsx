import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/app/AppHeader';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../services/api';
import CarteiraMotorista from '../../components/app/CarteiraMotorista';
import ModalPareamento from '../../components/app/ModalPareamento';
import AvaliacaoCampanha from '../../components/app/AvaliacaoCampanha';

const ACCENT = '#0a9d6c';
const NAV = ['Início', 'Oportunidades', 'Meus anúncios', 'Minhas jornadas', 'Carteira'];

const brl = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

function Stat({ icon, label, value, delta }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(6,40,29,0.5)]">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {delta && <span className="text-xs font-semibold" style={{ color: ACCENT }}>{delta}</span>}
      </div>
      <p className="mt-4 font-grotesk text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink/50">{label}</p>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-ink/50">
      {children}
    </div>
  );
}

export default function HomeMotorista() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState('Início');
  const [ops, setOps] = useState(null);
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(null); // campaignId sendo aceito
  const [toast, setToast] = useState('');
  const [temTablet, setTemTablet] = useState(null); // null = ainda carregando
  const [confirmarRemocao, setConfirmarRemocao] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [carteira, setCarteira] = useState(null);
  const [toastErro, setToastErro] = useState(false);
  const [mostrarPareamento, setMostrarPareamento] = useState(false);
  /**
   * Anúncio que o motorista tentou rodar e esbarrou na falta de tablet.
   * Guardado para entrar sozinho assim que o pareamento terminar — pedir para
   * ele procurar o mesmo card de novo, depois de já ter dito que queria aquele,
   * é o tipo de passo em que se desiste.
   */
  const [campanhaPendente, setCampanhaPendente] = useState(null);
  const [avaliacaoCampanha, setAvaliacaoCampanha] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/entrar/motorista', { replace: true });
  }, [isAuthenticated, navigate]);

  const loadOps = useCallback(async () => {
    try { setOps(await apiClient.getOpportunities()); } catch { setOps([]); }
  }, []);
  const loadMine = useCallback(async () => {
    try { setMine(await apiClient.getDriverCampaigns()); } catch { setMine([]); }
  }, []);

  const loadTablets = useCallback(async () => {
    try {
      const ds = await apiClient.getDriverDevices();
      setTemTablet(ds.some((d) => d.status === 'ACTIVE'));
    } catch {
      setTemTablet(null); // erro de rede não deve virar um aviso falso de "sem tablet"
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try { setSessions(await apiClient.getDriverSessions()); } catch { setSessions([]); }
  }, []);

  const loadCarteira = useCallback(async () => {
    try { setCarteira(await apiClient.getDriverWallet()); } catch { setCarteira(null); }
  }, []);

  useEffect(() => { loadOps(); loadMine(); loadTablets(); loadCarteira(); },
    [loadOps, loadMine, loadTablets, loadCarteira]);

  // Jornadas só carregam quando a aba é aberta — é a lista mais pesada e a
  // maioria das visitas ao app não passa por ela.
  useEffect(() => { if (tab === 'Minhas jornadas' && sessions == null) loadSessions(); },
    [tab, sessions, loadSessions]);

  const accept = async (id) => {
    setBusy(id);
    try {
      await apiClient.acceptOpportunity(id);
      setToastErro(false);
      setToast('Anúncio adicionado! Já está rodando no seu tablet.');
      await Promise.all([loadOps(), loadMine()]);
      setTimeout(() => setToast(''), 3500);
    } catch (e) {
      // Falta de tablet não é erro para toast: é um passo que ficou para trás.
      // O `temTablet === false` da tela é só um atalho — ele não vale quando a
      // consulta de aparelhos falhou (fica `null`), quando o clique veio antes
      // dela responder, ou quando o motorista desvinculou o tablet noutra aba.
      // Em todos esses casos o aceite chegava ao servidor, voltava recusado e
      // virava um toast vermelho sem saída. Quem manda é a resposta do backend.
      if (e?.apiCode === 'TABLET_NOT_PAIRED') {
        setTemTablet(false);
        setCampanhaPendente(id);
        setMostrarPareamento(true);
        return;
      }
      setToastErro(true);
      setToast(e?.message || 'Não foi possível aceitar agora.');
      setTimeout(() => setToast(''), 5000);
    } finally {
      setBusy(null);
    }
  };

  const firstName = (user?.name || user?.fullName || 'Parceiro').split(' ')[0];

  // Métricas derivadas do que o backend devolve por campanha aceita
  // (leads/scans/earnings são reais) — parceiro novo começa zerado.
  const loading = mine == null;
  // Ganho e leads convertidos vêm da carteira, que é o registro do que de fato
  // foi creditado. Antes eram somados das campanhas aceitas — quem ganhou por
  // uma campanha que já saiu do tablet via R$ 0,00 mesmo tendo recebido.
  const totalGanhos = carteira?.total ?? null;
  const totalLeads = carteira?.leadsConvertidos ?? null;
  const totalScans = mine?.reduce((s, c) => s + Number(c.scans || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-ink">
      <AppHeader accent={ACCENT} badge="Motorista parceiro" nav={NAV} active={tab} onNav={setTab} />

      {/* Verde é "deu certo". O aviso de erro vinha verde também, então uma
          recusa da API se parecia com confirmação. */}
      {toast && (
        <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-lg w-fit rounded-2xl px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg"
          style={{ background: toastErro ? '#B42318' : ACCENT }}>
          {toast}
        </div>
      )}

      <ModalPareamento
        aberto={mostrarPareamento}
        aoFechar={() => {
          setMostrarPareamento(false);
          setCampanhaPendente(null);
        }}
        aoParear={() => {
          setMostrarPareamento(false);
          setTemTablet(true);
          loadTablets();

          // Consome o pendente: sem zerar, um pareamento futuro feito pelo
          // aviso do topo (que não tem anúncio associado) aceitaria de novo a
          // campanha guardada aqui, sem o motorista ter pedido.
          const pendente = campanhaPendente;
          setCampanhaPendente(null);
          if (pendente) {
            accept(pendente);
            return; // o accept já dá o retorno na tela
          }

          setToastErro(false);
          setToast('Tablet pareado! Agora é só escolher os anúncios.');
          setTimeout(() => setToast(''), 3500);
        }}
      />

      {/* Modal de avaliação */}
      {avaliacaoCampanha && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
          onClick={() => setAvaliacaoCampanha(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-6 py-5 sticky top-0 bg-white">
              <h2 className="font-grotesk text-xl font-bold text-ink">Avalie esta campanha</h2>
              <button
                onClick={() => setAvaliacaoCampanha(null)}
                className="rounded-full p-1.5 text-ink/40 transition hover:bg-black/5 hover:text-ink"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <AvaliacaoCampanha
                campaignId={avaliacaoCampanha}
                jaParticipou={true}
                onClose={() => setAvaliacaoCampanha(null)}
              />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* Tab bar (mobile + clareza) */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {NAV.map((n) => {
            const count = n === 'Oportunidades' ? ops?.length : n === 'Meus anúncios' ? mine?.length : null;
            return (
              <button key={n} onClick={() => setTab(n)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === n ? 'text-white' : 'bg-white text-ink/60 ring-1 ring-black/5'}`}
                style={tab === n ? { background: ACCENT } : undefined}>
                {n}{count != null ? ` · ${count}` : ''}
              </button>
            );
          })}
          {/* Perfil e pareamento do tablet moram fora das abas de campanha. */}
          <button
            onClick={() => navigate('/app/motorista/perfil')}
            className="ml-auto shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink/60 ring-1 ring-black/5 transition hover:text-ink"
          >
            Perfil e tablet
          </button>
        </div>

        {/* ───────── INÍCIO ───────── */}
        {tab === 'Início' && (
          <>
            <div className="flex flex-col justify-between gap-5 rounded-3xl p-7 text-white md:flex-row md:items-center md:p-9"
              style={{ background: 'linear-gradient(140deg,#06281d 0%,#0a9d6c 100%)' }}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: '#8ff0cd' }}>Sua central de ganhos</span>
                <h1 className="mt-2 font-grotesk text-3xl font-bold tracking-tight md:text-4xl">Bom te ver, {firstName} 🚕</h1>
                <p className="mt-2 max-w-lg text-sm text-white/70">
                  {mine?.length
                    ? <>Você tem {mine.length} anúncio(s) rodando no seu tablet. Novas empresas aparecem na aba <strong>Oportunidades</strong>.</>
                    : <>Aceite seu primeiro anúncio para começar a faturar. Veja quem está buscando parceiros na aba <strong>Oportunidades</strong>.</>}
                </p>
              </div>
              <button onClick={() => setTab('Oportunidades')}
                className="shrink-0 rounded-full bg-white/10 px-6 py-4 text-center ring-1 ring-white/15 transition hover:bg-white/20">
                <p className="text-xs uppercase tracking-wide text-white/60">Oportunidades novas</p>
                <p className="mt-1 font-grotesk text-2xl font-bold">{ops?.length ?? '—'}</p>
                <p className="text-xs text-white/60">empresas buscando parceiros</p>
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat icon="💰" label="Ganhos acumulados" value={totalGanhos == null ? '—' : brl(totalGanhos)} />
              <Stat icon="🎯" label="Leads convertidos" value={totalLeads == null ? '—' : totalLeads} />
              <Stat icon="📱" label="Escaneamentos de QR" value={loading ? '—' : totalScans} />
              <Stat icon="🚗" label="Anúncios rodando" value={loading ? '—' : mine.length} />
            </div>

            <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-grotesk text-lg font-bold text-ink">Ganhos por anúncio</h2>
                {!!mine?.length && (
                  <button onClick={() => setTab('Meus anúncios')} className="text-sm font-semibold" style={{ color: ACCENT }}>
                    Ver todos
                  </button>
                )}
              </div>
              {loading ? (
                <p className="mt-4 text-sm text-ink/50">Carregando…</p>
              ) : mine.length === 0 ? (
                <p className="mt-4 text-sm text-ink/50">
                  Você ainda não aceitou nenhum anúncio.{' '}
                  <button onClick={() => setTab('Oportunidades')} className="font-semibold underline" style={{ color: ACCENT }}>
                    Veja as oportunidades
                  </button>
                  .
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-black/5">
                  {mine.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{c.title}</p>
                        <p className="text-xs text-ink/50">
                          {c.company} · {c.scans || 0} escaneamento(s) · {c.leads || 0} lead(s)
                        </p>
                      </div>
                      <span className="shrink-0 font-grotesk font-bold" style={{ color: ACCENT }}>
                        {brl(c.earnings)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ───────── OPORTUNIDADES ───────── */}
        {tab === 'Oportunidades' && (
          <div>
            <div className="mb-5">
              <h1 className="font-grotesk text-2xl font-bold text-ink">Empresas buscando parceiros</h1>
              <p className="mt-1 text-sm text-ink/55">Escolha quais anúncios você quer rodar no seu tablet. Você ganha por lead gerado.</p>
            </div>

            {/* Sem tablet o aceite é recusado no backend — avisar antes evita o
                motorista tentar, tomar erro e não entender o porquê. */}
            {temTablet === false && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-amber-900">Pareie o tablet para começar</p>
                  <p className="mt-0.5 text-sm text-amber-800/80">
                    O anúncio precisa de uma tela para aparecer. Sem tablet pareado você ainda não
                    consegue aceitar campanhas.
                  </p>
                </div>
                <button
                  onClick={() => setMostrarPareamento(true)}
                  className="shrink-0 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
                >
                  Parear tablet
                </button>
              </div>
            )}
            {ops == null ? (
              <Empty>Carregando oportunidades…</Empty>
            ) : ops.length === 0 ? (
              <Empty>Nenhuma oportunidade nova no momento. Volte em breve! 🚀</Empty>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {ops.map((o) => (
                  <div key={o.id} className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_20px_50px_-40px_rgba(6,40,29,0.5)]"
                    style={{
                      borderWidth: '2px',
                      borderColor: o.participated ? '#FCD34D' : '#00000010',
                    }}>
                    {o.participated && (
                      <div className="mb-3 inline-flex w-fit rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        ⭐ Já participou
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{o.company}</span>
                        <h3 className="mt-1 font-grotesk text-lg font-bold text-ink">{o.title}</h3>
                      </div>
                      <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: ACCENT }}>
                        R$ {o.pricePerLead}/lead
                      </span>
                    </div>
                    {o.description && <p className="mt-2 text-sm text-ink/60">{o.description}</p>}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink/60">
                      {o.industry && <span className="rounded-full bg-black/5 px-2.5 py-1">{o.industry}</span>}
                      <span className="rounded-full bg-black/5 px-2.5 py-1">{o.remaining} vaga(s) restante(s)</span>
                      <span className="rounded-full bg-black/5 px-2.5 py-1">{o.acceptedCount} já rodando</span>
                    </div>
                    <button
                      onClick={() => {
                        if (o.participated) {
                          setAvaliacaoCampanha(o.id);
                        } else if (temTablet === false) {
                          setCampanhaPendente(o.id);
                          setMostrarPareamento(true);
                        } else {
                          accept(o.id);
                        }
                      }}
                      disabled={busy === o.id}
                      className="mt-5 rounded-full py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                      style={{ background: ACCENT, boxShadow: '0 16px 40px -14px rgba(10,157,108,0.7)' }}>
                      {busy === o.id ? 'Aceitando…'
                        : o.participated ? '⭐ Avaliar'
                        : temTablet === false ? 'Parear tablet para rodar'
                        : 'Rodar este anúncio'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───────── MEUS ANÚNCIOS ───────── */}
        {tab === 'Meus anúncios' && (
          <div>
            <div className="mb-5">
              <h1 className="font-grotesk text-2xl font-bold text-ink">Anúncios rodando no seu tablet</h1>
              <p className="mt-1 text-sm text-ink/55">Os anúncios que você aceitou e estão sendo exibidos nas suas corridas.</p>
            </div>
            {mine == null ? (
              <Empty>Carregando…</Empty>
            ) : mine.length === 0 ? (
              <Empty>Você ainda não está rodando nenhum anúncio. Veja as <button onClick={() => setTab('Oportunidades')} className="font-semibold underline" style={{ color: ACCENT }}>oportunidades</button>.</Empty>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mine.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-black/5 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{c.company || 'Anúncio'}</span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: ACCENT }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} /> Ativo
                      </span>
                    </div>
                    <h3 className="mt-1 font-grotesk text-lg font-bold text-ink">{c.title}</h3>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-ink/50">Por lead</dt><dd className="font-semibold text-ink">R$ {c.pricePerLead}</dd></div>
                      <div className="flex justify-between"><dt className="text-ink/50">Leads gerados</dt><dd className="font-semibold text-ink">{c.leads}</dd></div>
                      <div className="flex justify-between"><dt className="text-ink/50">Ganhos</dt><dd className="font-semibold" style={{ color: ACCENT }}>R$ {c.earnings}</dd></div>
                    </dl>

                    {/* O tablet é do motorista: ele pode recusar qualquer
                        anúncio, inclusive os que o MASTER colocou. */}
                    <button
                      onClick={() => setConfirmarRemocao(c)}
                      className="mt-4 w-full rounded-xl border border-black/10 py-2.5 text-sm font-medium text-ink/55 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      Tirar do meu tablet
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───────── MINHAS JORNADAS ───────── */}
        {tab === 'Minhas jornadas' && (
          <div>
            <div className="mb-5">
              <h1 className="font-grotesk text-2xl font-bold text-ink">Suas jornadas</h1>
              <p className="mt-1 text-sm text-ink/55">
                Cada vez que você encerra o tablet, o período vira uma jornada com o que rendeu.
                Dá para encerrar mais de uma vez no mesmo dia.
              </p>
            </div>
            {sessions == null ? (
              <Empty>Carregando…</Empty>
            ) : sessions.length === 0 ? (
              <Empty>
                Nenhuma jornada encerrada ainda. Pareie o tablet, rode os anúncios e toque em
                “Encerrar jornada” na tela do aparelho.
              </Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map((s) => {
                  const d = new Date(s.startedAt);
                  const f = new Date(s.endedAt);
                  const hora = (x) =>
                    x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const h = Math.floor(s.durationMinutes / 60);
                  const m = s.durationMinutes % 60;
                  return (
                    <div key={s.id} className="rounded-2xl border border-black/5 bg-white p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <h3 className="font-grotesk text-lg font-bold text-ink">
                            {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                            {s.totalNoDia > 1 && (
                              <span className="ml-2 text-sm font-semibold text-ink/45">
                                {s.ordemNoDia}ª jornada do dia
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-ink/50">
                            {hora(d)} às {hora(f)} ·{' '}
                            {h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`}
                          </p>
                        </div>
                        <div className="flex gap-5 text-sm tabular-nums">
                          <span className="text-ink/60">{s.impressions} exibições</span>
                          <span className="text-ink/60">{s.uniqueScans} leram o QR</span>
                          <span className="font-bold" style={{ color: ACCENT }}>
                            {s.leads} {s.leads === 1 ? 'lead' : 'leads'}
                          </span>
                        </div>
                      </div>
                      {s.campaigns.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/5 pt-3">
                          {s.campaigns.map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-black/[0.04] px-2 py-1 text-xs text-ink/60"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ───────── CARTEIRA ───────── */}
        {tab === 'Carteira' && (
          <div>
            <div className="mb-5">
              <h1 className="font-grotesk text-2xl font-bold text-ink">Sua carteira</h1>
              <p className="mt-1 text-sm text-ink/55">
                O que você já ganhou, o que ainda vai cair e a conta que recebe o PIX.
              </p>
            </div>
            <CarteiraMotorista />
          </div>
        )}
      </main>

      {/* Confirmação: tirar o anúncio interrompe uma fonte de renda dele e a
          vaga volta para o mercado. Merece um passo a mais que um clique. */}
      {confirmarRemocao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-grotesk text-lg font-bold text-ink">Tirar este anúncio?</h3>
            <p className="mt-2 text-sm text-ink/60">
              <span className="font-semibold text-ink">{confirmarRemocao.title}</span> para de
              aparecer no seu tablet e você deixa de ganhar por lead dele. A vaga volta para outro
              motorista — para rodar de novo, você precisa aceitar quando reaparecer.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmarRemocao(null)}
                disabled={removendo}
                className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-black/5 disabled:opacity-50"
              >
                Manter
              </button>
              <button
                onClick={async () => {
                  setRemovendo(true);
                  try {
                    await apiClient.removeDriverCampaign(confirmarRemocao.id);
                    setConfirmarRemocao(null);
                    await Promise.all([loadMine(), loadOps()]);
                    flash('Anúncio removido do seu tablet.');
                  } catch (e) {
                    flash(e?.response?.data?.message || 'Não consegui remover agora.');
                  } finally {
                    setRemovendo(false);
                  }
                }}
                disabled={removendo}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {removendo ? 'Removendo…' : 'Tirar do tablet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
