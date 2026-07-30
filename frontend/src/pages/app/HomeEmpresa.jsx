import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoWordmark } from '../../components/landing/Logo';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../services/api';
import BannerStudio from '../../components/app/BannerStudio';

const ACCENT = '#2563FF';
const INK = '#0B1D3A';
const OK = '#0a9d6c';

const brl = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

// ── Ícones (stroke fino, sem emoji) ───────────────────────────────────────
const I = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  plus: 'M12 5v14M5 12h14',
  users: 'M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M22 20v-2a4 4 0 0 0-3-3.87',
  mega: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a5 5 0 0 1 0 8',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35',
};

function Icon({ d, className = 'h-[18px] w-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Peças ─────────────────────────────────────────────────────────────────
function Card({ children, className = '', pad = true }) {
  return (
    <div className={`rounded-xl border border-[#E4E7EC] bg-white ${pad ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#0B1D3A]/45">{label}</p>
      <p className="mt-2 font-grotesk text-[26px] font-bold leading-none tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-[#0B1D3A]/40">{hint}</p>}
    </Card>
  );
}

function Badge({ tone = 'muted', children }) {
  const tones = {
    ok: { background: 'rgba(10,157,108,0.10)', color: OK },
    info: { background: 'rgba(37,99,255,0.10)', color: ACCENT },
    muted: { background: 'rgba(11,29,58,0.06)', color: 'rgba(11,29,58,0.55)' },
  };
  return (
    <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold" style={tones[tone]}>
      {children}
    </span>
  );
}

function Th({ children, className = '' }) {
  return (
    <th className={`whitespace-nowrap border-b border-[#E4E7EC] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#0B1D3A]/45 ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = '' }) {
  return <td className={`border-b border-[#EFF1F4] px-4 py-3 text-sm text-ink ${className}`}>{children}</td>;
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-[#0B1D3A]/45">{children}</td>
    </tr>
  );
}

function Search({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0B1D3A]/35">
        <Icon d={I.search} className="h-4 w-4" />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#E4E7EC] bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-[#0B1D3A]/35 focus:border-[#2563FF] focus:ring-2 focus:ring-[#2563FF22] sm:w-64"
      />
    </div>
  );
}

// Chip de segmentação: clicar liga/desliga o filtro. Nada selecionado numa
// dimensão significa "sem restrição" nela.
function TargetChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-[#2563FF] bg-[#2563FF14] text-[#2563FF]'
          : 'border-[#E4E7EC] bg-white text-[#0B1D3A]/55 hover:border-[#0B1D3A]/25'
      }`}
    >
      {children}
    </button>
  );
}

const fieldCls =
  'w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-[#0B1D3A]/35 focus:border-[#2563FF] focus:ring-2 focus:ring-[#2563FF22]';
const labelCls = 'mb-1.5 block text-xs font-semibold text-[#0B1D3A]/70';
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d54e0] disabled:opacity-60';
const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2 text-sm font-medium text-[#0B1D3A]/75 transition hover:bg-[#F7F8FA]';

const NAV = [
  { key: 'Visão geral', icon: I.grid },
  { key: 'Criar anúncio', icon: I.plus },
  { key: 'Motoristas', icon: I.users },
  { key: 'Campanhas', icon: I.mega },
];

export default function HomeEmpresa() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [tab, setTab] = useState('Visão geral');
  const [campaigns, setCampaigns] = useState(null);
  const [motoristas, setMotoristas] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');
  const [qMot, setQMot] = useState('');
  const [qCamp, setQCamp] = useState('');
  const [desired, setDesired] = useState(5);

  const EMPTY_FORM = {
    title: '',
    description: '',
    numVehicles: 5,
    durationDays: 30,
    pricePerLead: 8,
    // Banner e montagem do anúncio na tela do tablet
    imageUrl: '',
    bannerRatio: null,
    showQr: true,
    qrPosition: 'BOTTOM_RIGHT',
    showText: true,
    destinationUrl: '',
    ctaText: '',
    // Segmentação — array vazio = alcança qualquer motorista
    targetRegions: [],
    targetStates: [],
    targetCities: [],
    targetRideApps: [],
    targetCategories: [],
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [catalog, setCatalog] = useState(null);

  // Catálogo de regiões/UFs/apps/modalidades vem do backend para não divergir
  // dos enums do banco.
  useEffect(() => {
    apiClient.getSegmentationCatalog().then(setCatalog).catch(() => {});
  }, []);

  const toggleTarget = (key, value) =>
    setForm((f) => {
      const list = f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value];
      const next = { ...f, [key]: list };
      // Ao tirar um app, as modalidades dele deixam de fazer sentido.
      if (key === 'targetRideApps') {
        const validCats = (catalog?.rideCategories || [])
          .filter((c) => list.includes(c.app))
          .map((c) => c.value);
        next.targetCategories = f.targetCategories.filter((c) => validCats.includes(c));
      }
      return next;
    });

  useEffect(() => {
    if (!isAuthenticated) navigate('/entrar/empresa', { replace: true });
  }, [isAuthenticated, navigate]);

  const loadCampaigns = useCallback(async () => {
    try { setCampaigns(await apiClient.getAdvertiserCampaigns()); } catch { setCampaigns([]); }
  }, []);
  const loadMotoristas = useCallback(async () => {
    try { setMotoristas(await apiClient.getMotoristas()); } catch { setMotoristas([]); }
  }, []);
  useEffect(() => { loadCampaigns(); loadMotoristas(); }, [loadCampaigns, loadMotoristas]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const deleteCampaign = async (campaignId) => {
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    try {
      await apiClient.deleteCampaign(campaignId);
      flash('Anúncio deletado');
      await loadCampaigns();
      setDetail(null);
    } catch (err) {
      flash(err?.response?.data?.error || 'Erro ao deletar');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.title.trim() || form.title.trim().length < 3) return setFormErr('Dê um título ao anúncio.');
    if (!(Number(form.numVehicles) >= 1)) return setFormErr('Informe quantos motoristas você quer (mín. 1).');
    if (!(Number(form.pricePerLead) > 0)) return setFormErr('Informe o valor por lead.');
    // Sem QR não existe lead — cobrar por lead nesse caso seria vender o que
    // não dá para entregar.
    if (!form.showQr && Number(form.pricePerLead) > 0 && !form.imageUrl)
      return setFormErr('Sem QR e sem banner o anúncio fica vazio na tela. Envie um banner.');
    if (form.destinationUrl.trim()) {
      try {
        const u = new URL(form.destinationUrl.trim());
        if (!/^https?:$/.test(u.protocol)) throw new Error();
      } catch {
        return setFormErr('O link do QR precisa começar com https:// (ex.: https://seusite.com.br).');
      }
    }
    setCreating(true);
    try {
      await apiClient.createAd({
        title: form.title.trim(),
        description: form.description.trim(),
        numVehicles: Number(form.numVehicles),
        durationDays: Number(form.durationDays),
        pricePerLead: Number(form.pricePerLead),
        publish: true,
        imageUrl: form.imageUrl || undefined,
        showQr: form.showQr,
        qrPosition: form.qrPosition,
        showText: form.showText,
        destinationUrl: form.destinationUrl.trim() || undefined,
        ctaText: form.ctaText.trim() || undefined,
        targetRegions: form.targetRegions,
        targetStates: form.targetStates,
        targetCities: form.targetCities,
        targetRideApps: form.targetRideApps,
        targetCategories: form.targetCategories,
      });
      flash('Anúncio publicado — já aparece para os motoristas.');
      setForm(EMPTY_FORM);
      await loadCampaigns();
      setTab('Campanhas');
    } catch (err) {
      setFormErr(err?.message || 'Não foi possível publicar agora.');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id) => {
    if (detail?.id === id) return setDetail(null);
    try { setDetail(await apiClient.getCampaignDetails(id)); } catch { /* ignore */ }
  };

  const doLogout = async () => { await logout(); navigate('/'); };

  const name = user?.name || user?.fullName || user?.email?.split('@')[0] || 'Anunciante';
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  // Métricas — todas derivadas do que a API devolve.
  const loading = campaigns == null;
  const totalMotoristas = campaigns?.reduce((s, c) => s + (c.motoristasCount || 0), 0) ?? 0;
  const totalLeads = campaigns?.reduce((s, c) => s + (c.totalLeads || 0), 0) ?? 0;
  const investido = campaigns?.reduce((s, c) => s + (c.totalLeads || 0) * Number(c.pricePerLead || 0), 0) ?? 0;
  const ativas = campaigns?.filter((c) => c.status === 'ACTIVE').length ?? 0;

  const motFiltrados = useMemo(() => {
    const q = qMot.trim().toLowerCase();
    if (!q) return motoristas ?? [];
    return (motoristas ?? []).filter((m) =>
      [m.name, m.city, m.vehicle, m.rideApp].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [motoristas, qMot]);

  const campFiltradas = useMemo(() => {
    const q = qCamp.trim().toLowerCase();
    if (!q) return campaigns ?? [];
    return (campaigns ?? []).filter((c) => String(c.title || '').toLowerCase().includes(q));
  }, [campaigns, qCamp]);

  const subtitles = {
    'Visão geral': 'Resumo das suas campanhas e resultados.',
    'Criar anúncio': 'Publique um anúncio para os motoristas aceitarem.',
    Motoristas: 'Parceiros disponíveis na rede FastLead.',
    Campanhas: 'Todos os seus anúncios e o desempenho de cada um.',
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-ink">
      {/* ───────── Sidebar ───────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] flex-col border-r border-[#E4E7EC] bg-white md:flex">
        <div className="flex h-14 items-center border-b border-[#E4E7EC] px-5">
          <LogoWordmark />
        </div>

        <div className="px-3 pt-4">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#0B1D3A]/35">Anunciante</p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((n) => {
              const on = tab === n.key;
              const count = n.key === 'Campanhas' ? campaigns?.length : n.key === 'Motoristas' ? motoristas?.length : null;
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    on ? 'bg-[#2563FF0F] text-[#2563FF]' : 'text-[#0B1D3A]/65 hover:bg-[#F2F4F7] hover:text-ink'
                  }`}
                >
                  <Icon d={n.icon} />
                  <span className="flex-1 text-left">{n.key}</span>
                  {count != null && (
                    <span className={`text-xs font-semibold ${on ? 'text-[#2563FF]' : 'text-[#0B1D3A]/35'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#E4E7EC] p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563FF] text-xs font-bold text-white">
              {initials || '·'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{name}</p>
              <p className="truncate text-[11px] leading-tight text-[#0B1D3A]/45">{user?.email}</p>
            </div>
          </div>
          <button onClick={doLogout} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#0B1D3A]/60 transition hover:bg-[#F2F4F7] hover:text-ink">
            <Icon d={I.out} />
            Sair
          </button>
        </div>
      </aside>

      {/* ───────── Área principal ───────── */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-[228px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[#E4E7EC] bg-white/90 px-4 backdrop-blur md:px-7">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight">{tab}</h1>
            <p className="hidden truncate text-xs text-[#0B1D3A]/45 sm:block">{subtitles[tab]}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {tab !== 'Criar anúncio' && (
              <button onClick={() => setTab('Criar anúncio')} className={btnPrimary}>
                <Icon d={I.plus} className="h-4 w-4" />
                Novo anúncio
              </button>
            )}
            <button onClick={doLogout} title="Sair" className="rounded-lg border border-[#E4E7EC] p-2 text-[#0B1D3A]/50 transition hover:bg-[#F7F8FA] md:hidden">
              <Icon d={I.out} className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Nav mobile */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-[#E4E7EC] bg-white px-4 py-2 md:hidden">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === n.key ? 'bg-[#2563FF0F] text-[#2563FF]' : 'text-[#0B1D3A]/60'
              }`}
            >
              {n.key}
            </button>
          ))}
        </div>

        {toast && (
          <div className="sticky top-14 z-30 border-b border-[#cfe0ff] bg-[#EDF3FF] px-4 py-2.5 text-sm font-medium text-[#1d54e0] md:px-7">
            {toast}
          </div>
        )}

        <main className="flex-1 p-4 md:p-7">
          {/* ═════════ VISÃO GERAL ═════════ */}
          {tab === 'Visão geral' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Anúncios criados" value={loading ? '—' : campaigns.length}
                  hint={loading ? undefined : `${ativas} ativo(s)`} />
                <StatCard label="Motoristas rodando" value={loading ? '—' : totalMotoristas}
                  hint={`${motoristas?.length ?? 0} na rede`} />
                <StatCard label="Leads gerados" value={loading ? '—' : totalLeads}
                  hint="Passageiros que escanearam" />
                <StatCard label="Investido em leads" value={loading ? '—' : brl(investido)}
                  hint="Você paga por lead convertido" />
              </div>

              <Card pad={false}>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <h2 className="text-sm font-semibold">Últimos anúncios</h2>
                  {!!campaigns?.length && (
                    <button onClick={() => setTab('Campanhas')} className="text-sm font-semibold text-[#2563FF] hover:underline">
                      Ver todos
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                      <tr>
                        <Th>Anúncio</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Motoristas</Th>
                        <Th className="text-right">Leads</Th>
                        <Th className="text-right">R$/lead</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <EmptyRow colSpan={5}>Carregando…</EmptyRow>
                      ) : campaigns.length === 0 ? (
                        <EmptyRow colSpan={5}>
                          Nenhum anúncio ainda.{' '}
                          <button onClick={() => setTab('Criar anúncio')} className="font-semibold text-[#2563FF] hover:underline">
                            Criar o primeiro
                          </button>
                        </EmptyRow>
                      ) : (
                        campaigns.slice(0, 5).map((c) => (
                          <tr key={c.id} className="hover:bg-[#FAFBFC]">
                            <Td className="font-medium">{c.title}</Td>
                            <Td>
                              <Badge tone={c.status === 'ACTIVE' ? 'ok' : 'muted'}>
                                {c.status === 'ACTIVE' ? 'Publicado' : c.status}
                              </Badge>
                            </Td>
                            <Td className="text-right tabular-nums">{c.motoristasCount} / {c.targetVehicles}</Td>
                            <Td className="text-right tabular-nums">{c.totalLeads || 0}</Td>
                            <Td className="text-right tabular-nums">{brl(c.pricePerLead)}</Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═════════ CRIAR ANÚNCIO ═════════ */}
          {tab === 'Criar anúncio' && (
            <div className="grid max-w-5xl gap-5 lg:grid-cols-[1fr_280px]">
              <Card>
                {formErr && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                    {formErr}
                  </div>
                )}
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className={labelCls}>Título do anúncio</label>
                    <input className={fieldCls} value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex.: Pizzaria do Zé — 20% na 1ª compra" />
                  </div>
                  <div>
                    <label className={labelCls}>Descrição / chamada</label>
                    <textarea rows={3} className={fieldCls} value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="O que o passageiro vê ao escanear o QR" />
                  </div>

                  {/* Banner + como o anúncio é montado na tela do tablet */}
                  <BannerStudio
                    value={form}
                    onChange={(v) => setForm(v)}
                    fieldCls={fieldCls}
                    labelCls={labelCls}
                  />

                  {form.showQr && (
                    <div>
                      <label className={labelCls}>Chamada ao lado do QR (opcional)</label>
                      <input className={fieldCls} value={form.ctaText}
                        onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                        placeholder="Aponte a câmera e ganhe 20% off" />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>Motoristas</label>
                      <input type="number" min="1" className={fieldCls} value={form.numVehicles}
                        onChange={(e) => setForm((f) => ({ ...f, numVehicles: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>Duração (dias)</label>
                      <input type="number" min="1" className={fieldCls} value={form.durationDays}
                        onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>R$ por lead</label>
                      <input type="number" min="0" step="0.5" className={fieldCls} value={form.pricePerLead}
                        onChange={(e) => setForm((f) => ({ ...f, pricePerLead: e.target.value }))} />
                    </div>
                  </div>
                  {/* ── Segmentação: quem vai rodar este anúncio ── */}
                  <div className="rounded-xl border border-[#EFF1F4] bg-[#FAFBFC] p-4">
                    <p className="text-sm font-semibold text-[#0B1D3A]">Quem vai rodar</p>
                    <p className="mt-0.5 text-xs text-[#0B1D3A]/45">
                      Deixe em branco para alcançar qualquer motorista. Cada filtro estreita o
                      público.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className={labelCls}>Regiões</label>
                        <div className="flex flex-wrap gap-2">
                          {catalog?.regions.map((r) => (
                            <TargetChip
                              key={r.value}
                              active={form.targetRegions.includes(r.value)}
                              onClick={() => toggleTarget('targetRegions', r.value)}
                            >
                              {r.label}
                            </TargetChip>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={labelCls}>Estados</label>
                          <select
                            className={fieldCls}
                            value=""
                            onChange={(e) =>
                              e.target.value && toggleTarget('targetStates', e.target.value)
                            }
                          >
                            <option value="">Adicionar estado…</option>
                            {catalog?.states
                              .filter((s) => !form.targetStates.includes(s.value))
                              .map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                          </select>
                          {form.targetStates.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {form.targetStates.map((s) => (
                                <TargetChip
                                  key={s}
                                  active
                                  onClick={() => toggleTarget('targetStates', s)}
                                >
                                  {s} ×
                                </TargetChip>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={labelCls}>Cidades</label>
                          <input
                            className={fieldCls}
                            placeholder="Digite e aperte Enter"
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              const v = e.target.value.trim();
                              if (v && !form.targetCities.includes(v)) {
                                toggleTarget('targetCities', v);
                                e.target.value = '';
                              }
                            }}
                          />
                          {form.targetCities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {form.targetCities.map((c) => (
                                <TargetChip
                                  key={c}
                                  active
                                  onClick={() => toggleTarget('targetCities', c)}
                                >
                                  {c} ×
                                </TargetChip>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Aplicativos</label>
                        <div className="flex flex-wrap gap-2">
                          {catalog?.rideApps.map((a) => (
                            <TargetChip
                              key={a.value}
                              active={form.targetRideApps.includes(a.value)}
                              onClick={() => toggleTarget('targetRideApps', a.value)}
                            >
                              {a.label}
                            </TargetChip>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Modalidades</label>
                        {form.targetRideApps.length === 0 ? (
                          <p className="text-xs text-[#0B1D3A]/40">
                            Escolha um aplicativo acima para filtrar por modalidade.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {catalog?.rideCategories
                              .filter((c) => form.targetRideApps.includes(c.app))
                              .map((c) => (
                                <TargetChip
                                  key={c.value}
                                  active={form.targetCategories.includes(c.value)}
                                  onClick={() => toggleTarget('targetCategories', c.value)}
                                >
                                  {c.label}
                                </TargetChip>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="submit" disabled={creating} className={btnPrimary}>
                      {creating ? 'Publicando…' : 'Publicar anúncio'}
                    </button>
                    <button type="button" onClick={() => setTab('Visão geral')} className={btnGhost}>Cancelar</button>
                  </div>
                </form>
              </Card>

              <Card className="h-fit">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0B1D3A]/45">Investimento estimado</p>
                <p className="mt-2 font-grotesk text-[26px] font-bold leading-none tracking-tight">
                  {brl(Number(form.numVehicles) * Number(form.durationDays) * Number(form.pricePerLead) || 0)}
                </p>
                <dl className="mt-4 space-y-2 border-t border-[#EFF1F4] pt-3 text-sm">
                  {[
                    ['Motoristas', form.numVehicles],
                    ['Duração', `${form.durationDays} dias`],
                    ['Por lead', brl(form.pricePerLead)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-[#0B1D3A]/50">{k}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-[#0B1D3A]/40">Teto do período. Você paga por lead convertido.</p>
              </Card>
            </div>
          )}

          {/* ═════════ MOTORISTAS ═════════ */}
          {tab === 'Motoristas' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Search value={qMot} onChange={setQMot} placeholder="Buscar por nome, cidade, veículo…" />
                <div className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#0B1D3A]/55">Quero alcançar</label>
                    <input type="number" min="1" value={desired} onChange={(e) => setDesired(e.target.value)}
                      className={`${fieldCls} w-24`} />
                  </div>
                  <button
                    onClick={() => { setForm((f) => ({ ...f, numVehicles: Number(desired) || 1 })); setTab('Criar anúncio'); }}
                    className={btnPrimary}>
                    Criar anúncio p/ {desired || 1}
                  </button>
                </div>
              </div>

              <Card pad={false}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr>
                        <Th>Motorista</Th>
                        <Th>Cidade</Th>
                        <Th>Veículo</Th>
                        <Th>App</Th>
                        <Th className="text-right">Nota</Th>
                        <Th className="text-right">Campanhas</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {motoristas == null ? (
                        <EmptyRow colSpan={6}>Carregando…</EmptyRow>
                      ) : motFiltrados.length === 0 ? (
                        <EmptyRow colSpan={6}>
                          {qMot ? 'Nenhum motorista encontrado para essa busca.' : 'Nenhum motorista cadastrado ainda.'}
                        </EmptyRow>
                      ) : (
                        motFiltrados.map((m) => (
                          <tr key={m.id} className="hover:bg-[#FAFBFC]">
                            <Td>
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563FF] text-[11px] font-bold text-white">
                                  {(m.name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                                </span>
                                <span className="font-medium">{m.name}</span>
                              </div>
                            </Td>
                            <Td className="text-[#0B1D3A]/65">{m.city || '—'}</Td>
                            <Td className="text-[#0B1D3A]/65">{m.vehicle || '—'}</Td>
                            <Td>{m.rideApp ? <Badge tone="info">{m.rideApp}</Badge> : '—'}</Td>
                            <Td className="text-right tabular-nums">★ {m.rating ?? '—'}</Td>
                            <Td className="text-right tabular-nums">{m.campaignsCount ?? 0}</Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ═════════ CAMPANHAS ═════════ */}
          {tab === 'Campanhas' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Search value={qCamp} onChange={setQCamp} placeholder="Buscar anúncio…" />
                <span className="text-sm text-[#0B1D3A]/50">
                  {campaigns == null ? '' : `${campFiltradas.length} anúncio(s) · ${ativas} ativo(s)`}
                </span>
              </div>

              <Card pad={false}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead>
                      <tr>
                        <Th>Anúncio</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Motoristas</Th>
                        <Th className="text-right">Leads</Th>
                        <Th className="text-right">R$/lead</Th>
                        <Th className="text-right">Gasto</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns == null ? (
                        <EmptyRow colSpan={7}>Carregando…</EmptyRow>
                      ) : campFiltradas.length === 0 ? (
                        <EmptyRow colSpan={7}>
                          {qCamp ? 'Nenhum anúncio encontrado.' : (
                            <>Nenhum anúncio ainda.{' '}
                              <button onClick={() => setTab('Criar anúncio')} className="font-semibold text-[#2563FF] hover:underline">
                                Criar o primeiro
                              </button>
                            </>
                          )}
                        </EmptyRow>
                      ) : (
                        campFiltradas.map((c) => (
                          <Fragment key={c.id}>
                            <tr className="hover:bg-[#FAFBFC]">
                              <Td className="font-medium">{c.title}</Td>
                              <Td>
                                <Badge tone={c.status === 'ACTIVE' ? 'ok' : 'muted'}>
                                  {c.status === 'ACTIVE' ? 'Publicado' : c.status}
                                </Badge>
                              </Td>
                              <Td className="text-right tabular-nums">{c.motoristasCount} / {c.targetVehicles}</Td>
                              <Td className="text-right tabular-nums">{c.totalLeads || 0}</Td>
                              <Td className="text-right tabular-nums">{brl(c.pricePerLead)}</Td>
                              <Td className="text-right tabular-nums">{brl((c.totalLeads || 0) * Number(c.pricePerLead || 0))}</Td>
                              <Td className="text-right space-x-2">
                                <button onClick={() => openDetail(c.id)} className={btnGhost}>
                                  {detail?.id === c.id ? 'Ocultar' : 'Motoristas'}
                                </button>
                                <button onClick={() => deleteCampaign(c.id)} className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                                  Deletar
                                </button>
                              </Td>
                            </tr>
                            {detail?.id === c.id && (
                              <tr>
                                <td colSpan={7} className="border-b border-[#EFF1F4] bg-[#FAFBFC] px-4 py-4">
                                  {detail.motoristas?.length ? (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                      {detail.motoristas.map((m) => (
                                        <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2">
                                          <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563FF] text-[10px] font-bold text-white">
                                              {(m.name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                                            </span>
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-medium">{m.name}</p>
                                              <p className="truncate text-[11px] text-[#0B1D3A]/45">{m.city || '—'} · {m.vehicle || '—'}</p>
                                            </div>
                                          </div>
                                          <span className="shrink-0 text-xs font-semibold tabular-nums text-[#0B1D3A]/60">★ {m.rating}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-[#0B1D3A]/50">Nenhum motorista aceitou ainda.</p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
