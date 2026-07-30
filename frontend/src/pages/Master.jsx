import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useAuthStore } from '../stores/authStore';

/**
 * Painel MASTER — visão de todas as empresas e motoristas.
 *
 * Regra desta tela: todo número exibido vem de contagem no banco.
 * Zero é zero, e aparece como zero. Nada de valor de exemplo para
 * a tela parecer movimentada — já nos queimamos com isso antes.
 */

const nf = new Intl.NumberFormat('pt-BR');

function Stat({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-white',
    brand: 'text-brand',
    aqua: 'text-aqua',
    mint: 'text-mint',
  };
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="text-white/50 text-xs uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-bold tabular-nums ${tones[tone]}`}>{nf.format(value ?? 0)}</div>
      {hint && <div className="text-white/40 text-xs mt-1">{hint}</div>}
    </div>
  );
}

/** Gráfico de barras em SVG puro — não vale puxar uma lib por causa disto. */
function Sparkbars({ series }) {
  const max = Math.max(1, ...series.map((d) => Math.max(d.impressions, d.scans, d.leads)));
  const w = 100 / Math.max(1, series.length);

  if (!series.some((d) => d.impressions || d.scans || d.leads)) {
    return (
      <div className="h-40 flex items-center justify-center text-white/35 text-sm">
        Sem eventos nos últimos {series.length} dias — os dados aparecem aqui assim que o primeiro
        tablet exibir um anúncio.
      </div>
    );
  }

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-40">
      {series.map((d, i) => {
        const x = i * w;
        const bar = (v, color, offset) => (
          <rect
            x={x + w * offset}
            y={40 - (v / max) * 38}
            width={w * 0.26}
            height={(v / max) * 38}
            fill={color}
            rx="0.4"
          />
        );
        return (
          <g key={d.date}>
            {bar(d.impressions, '#2563FF', 0.08)}
            {bar(d.uniqueScans, '#00B4D8', 0.37)}
            {bar(d.leads, '#00C98A', 0.66)}
          </g>
        );
      })}
    </svg>
  );
}

function Funnel({ funnel, rates }) {
  const steps = [
    { label: 'Impressões', sub: 'anúncio exibido no tablet', value: funnel.impressions, color: 'bg-brand' },
    { label: 'Scans únicos', sub: 'pessoas que leram o QR', value: funnel.uniqueScans, color: 'bg-aqua' },
    { label: 'Leads', sub: 'deixaram contato', value: funnel.leads, color: 'bg-mint' },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className="flex flex-col gap-3">
      {steps.map((s) => (
        <div key={s.label}>
          <div className="flex items-baseline justify-between mb-1.5">
            <div>
              <span className="font-semibold">{s.label}</span>
              <span className="text-white/40 text-sm ml-2">{s.sub}</span>
            </div>
            <span className="text-xl font-bold tabular-nums">{nf.format(s.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full ${s.color} rounded-full transition-all`}
              style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex gap-6 text-sm text-white/50 mt-2 pt-3 border-t border-white/10">
        <span>
          Taxa de scan: <strong className="text-aqua">{rates.scanRate}%</strong>
        </span>
        <span>
          Scan → lead: <strong className="text-mint">{rates.leadRate}%</strong>
        </span>
      </div>
    </div>
  );
}

function Avatar({ url, name, size = 'w-9 h-9' }) {
  if (url) return <img src={url} alt="" className={`${size} rounded-full object-cover`} />;
  return (
    <div className={`${size} rounded-full bg-brand/25 flex items-center justify-center text-xs font-bold text-brand`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function Master() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [catalog, setCatalog] = useState(null);
  const [filters, setFilters] = useState({});
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState([]);
  const [tab, setTab] = useState('drivers');
  const [drivers, setDrivers] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(null);
  const [notice, setNotice] = useState('');

  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    [filters]
  );

  useEffect(() => {
    apiClient.getSegmentationCatalog().then(setCatalog).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, ts] = await Promise.all([
        apiClient.masterOverview(activeFilters),
        apiClient.masterTimeseries(14, activeFilters),
      ]);
      setOverview(ov);
      setSeries(ts);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // Distribuição automática: coloca a campanha nos tablets que batem com a
  // segmentação. Reporta exatamente quantos entraram — inclusive zero.
  const distribute = async (campaignId) => {
    setDistributing(campaignId);
    setNotice('');
    try {
      const r = await apiClient.masterDistribute(campaignId);
      setNotice(
        r.assigned > 0
          ? `${r.assigned} motorista(s) receberam a campanha no tablet.`
          : r.reason || 'Nenhum motorista elegível.'
      );
      const [ov, camps] = await Promise.all([
        apiClient.masterOverview(activeFilters),
        apiClient.masterCampaigns(),
      ]);
      setOverview(ov);
      setCampaigns(camps);
    } catch (e) {
      setNotice(e?.response?.data?.error || 'Falha ao distribuir');
    } finally {
      setDistributing(null);
    }
  };

  useEffect(() => {
    if (tab === 'drivers') apiClient.masterDrivers(activeFilters).then(setDrivers).catch(() => {});
    if (tab === 'companies') apiClient.masterCompanies().then(setCompanies).catch(() => {});
    if (tab === 'campaigns') apiClient.masterCampaigns().then(setCampaigns).catch(() => {});
  }, [tab, activeFilters]);

  // Modalidades dependem dos apps: só faz sentido oferecer UberX se o filtro de app
  // estiver em Uber ou vazio.
  const categoryOptions = useMemo(() => {
    if (!catalog) return [];
    if (!filters.rideApp) return catalog.rideCategories;
    return catalog.rideCategories.filter((c) => c.app === filters.rideApp);
  }, [catalog, filters.rideApp]);

  const setFilter = (key, value) =>
    setFilters((f) => {
      const next = { ...f, [key]: value };
      if (key === 'rideApp') delete next.rideCategory; // categoria antiga pode não valer mais
      if (key === 'region') delete next.state;
      return next;
    });

  const stateOptions = useMemo(() => {
    if (!catalog) return [];
    if (!filters.region) return catalog.states;
    return catalog.states.filter((s) => s.region === filters.region);
  }, [catalog, filters.region]);

  const selectCls =
    'px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm text-white focus:outline-none focus:border-brand [&>option]:bg-ink';

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-ink/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-brand via-aqua to-mint text-ink text-xs font-bold tracking-wider">
            MASTER
          </div>
          <span className="font-grotesk text-xl font-bold">FastLead</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/50 hidden sm:inline">{user?.email}</span>
          <button
            onClick={async () => {
              await logout();
              navigate('/entrar');
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="px-4 py-3 rounded-xl bg-brand/15 border border-brand/40 text-white/90 flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-white/40 hover:text-white">
              ×
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-white/40 text-xs uppercase tracking-widest mr-1">Filtrar</span>
          <select
            value={filters.region || ''}
            onChange={(e) => setFilter('region', e.target.value)}
            className={selectCls}
          >
            <option value="">Todas as regiões</option>
            {catalog?.regions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={filters.state || ''}
            onChange={(e) => setFilter('state', e.target.value)}
            className={selectCls}
          >
            <option value="">Todos os estados</option>
            {stateOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <input
            value={filters.city || ''}
            onChange={(e) => setFilter('city', e.target.value)}
            placeholder="Cidade"
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm placeholder-white/35 focus:outline-none focus:border-brand w-36"
          />

          <select
            value={filters.rideApp || ''}
            onChange={(e) => setFilter('rideApp', e.target.value)}
            className={selectCls}
          >
            <option value="">Todos os apps</option>
            {catalog?.rideApps.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>

          <select
            value={filters.rideCategory || ''}
            onChange={(e) => setFilter('rideCategory', e.target.value)}
            className={selectCls}
          >
            <option value="">Todas as modalidades</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={() => setFilters({})}
              className="px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat label="Empresas" value={overview?.totals.advertisers} hint="anunciantes cadastrados" />
          <Stat
            label="Motoristas"
            value={overview?.totals.driversTotal}
            hint={`${nf.format(overview?.totals.driversActive || 0)} ativos`}
            tone="mint"
          />
          <Stat label="Tablets" value={overview?.totals.devicesPaired} hint="pareados e rodando" tone="aqua" />
          <Stat
            label="Campanhas"
            value={overview?.totals.campaignsTotal}
            hint={`${nf.format(overview?.totals.campaignsActive || 0)} ativas`}
          />
          <Stat label="Leads" value={overview?.funnel.leads} hint="contatos capturados" tone="brand" />
        </div>

        {/* Funil + gráfico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="font-semibold mb-1">Funil de divulgação</h2>
            <p className="text-white/40 text-sm mb-5">
              Quantas pessoas viram, quantas leram o QR e quantas viraram contato
            </p>
            {overview && <Funnel funnel={overview.funnel} rates={overview.rates} />}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">Últimos 14 dias</h2>
              <div className="flex gap-3 text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <i className="w-2.5 h-2.5 rounded-sm bg-brand inline-block" /> impressões
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="w-2.5 h-2.5 rounded-sm bg-aqua inline-block" /> scans
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="w-2.5 h-2.5 rounded-sm bg-mint inline-block" /> leads
                </span>
              </div>
            </div>
            <Sparkbars series={series} />
          </div>
        </div>

        {/* Abas */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="flex border-b border-white/10">
            {[
              ['drivers', 'Motoristas'],
              ['companies', 'Empresas'],
              ['campaigns', 'Campanhas'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-5 py-3 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'text-white border-b-2 border-brand bg-white/5'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {tab === 'drivers' && (
              <table className="w-full text-sm min-w-[820px]">
                <thead className="text-white/40 text-xs uppercase tracking-wider">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-3 font-medium">Motorista</th>
                    <th className="text-left px-4 py-3 font-medium">Região</th>
                    <th className="text-left px-4 py-3 font-medium">Apps / Modalidades</th>
                    <th className="text-right px-4 py-3 font-medium">Impressões</th>
                    <th className="text-right px-4 py-3 font-medium">Scans</th>
                    <th className="text-right px-4 py-3 font-medium">Leads</th>
                    <th className="text-right px-5 py-3 font-medium">Tablets</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers?.drivers.map((d) => (
                    <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar url={d.avatarUrl} name={d.name} />
                          <div>
                            <div className="font-medium">{d.name}</div>
                            <div className="text-white/40 text-xs">{d.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {[d.city, d.state].filter(Boolean).join(' · ') || '—'}
                        {d.regionLabel && (
                          <div className="text-white/35 text-xs">{d.regionLabel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {d.rideApps.length === 0 && <span className="text-white/30">—</span>}
                          {d.rideApps.map((a) => (
                            <span
                              key={a.value}
                              className="px-2 py-0.5 rounded-md bg-brand/20 text-brand text-xs"
                            >
                              {a.label}
                            </span>
                          ))}
                          {d.rideCategories.map((c) => (
                            <span
                              key={c.value}
                              className="px-2 py-0.5 rounded-md bg-white/10 text-white/60 text-xs"
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {nf.format(d.metrics.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-aqua">
                        {nf.format(d.metrics.scans)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-mint">
                        {nf.format(d.metrics.leads)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{d.metrics.devices}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'companies' && (
              <table className="w-full text-sm min-w-[720px]">
                <thead className="text-white/40 text-xs uppercase tracking-wider">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-3 font-medium">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium">Contato</th>
                    <th className="text-right px-4 py-3 font-medium">Campanhas</th>
                    <th className="text-right px-4 py-3 font-medium">Impressões</th>
                    <th className="text-right px-4 py-3 font-medium">Scans</th>
                    <th className="text-right px-5 py-3 font-medium">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {companies?.companies.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-5 py-3">
                        <div className="font-medium">{c.tradeName || c.companyName}</div>
                        {c.industry && <div className="text-white/40 text-xs">{c.industry}</div>}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        <div>{c.contactName}</div>
                        <div className="text-white/40 text-xs">{c.contactEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.metrics.campaigns}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {nf.format(c.metrics.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-aqua">
                        {nf.format(c.metrics.scans)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-mint">
                        {nf.format(c.metrics.leads)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'campaigns' && (
              <table className="w-full text-sm min-w-[780px]">
                <thead className="text-white/40 text-xs uppercase tracking-wider">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-5 py-3 font-medium">Campanha</th>
                    <th className="text-left px-4 py-3 font-medium">Segmentação</th>
                    <th className="text-right px-4 py-3 font-medium">Motoristas</th>
                    <th className="text-right px-4 py-3 font-medium">Impressões</th>
                    <th className="text-right px-4 py-3 font-medium">Scans</th>
                    <th className="text-right px-4 py-3 font-medium">Leads</th>
                    <th className="text-right px-5 py-3 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns?.campaigns.map((c) => {
                    const t = c.targeting;
                    const chips = [
                      ...t.regions,
                      ...t.states,
                      ...t.cities,
                      ...t.rideApps,
                      ...t.categories,
                    ];
                    return (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-5 py-3">
                          <div className="font-medium">{c.title}</div>
                          <div className="text-white/40 text-xs">{c.advertiser}</div>
                        </td>
                        <td className="px-4 py-3">
                          {chips.length === 0 ? (
                            <span className="text-white/35 text-xs">sem restrição</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {chips.slice(0, 4).map((x) => (
                                <span
                                  key={x}
                                  className="px-2 py-0.5 rounded-md bg-white/10 text-white/60 text-xs"
                                >
                                  {x}
                                </span>
                              ))}
                              {chips.length > 4 && (
                                <span className="text-white/35 text-xs">+{chips.length - 4}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {c.assignedDrivers}
                          <span className="text-white/35">/{c.targetVehicles}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {nf.format(c.metrics.impressions)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-aqua">
                          {nf.format(c.metrics.scans)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-mint">
                          {nf.format(c.metrics.leads)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => distribute(c.id)}
                            disabled={distributing === c.id}
                            className="px-3 py-1.5 rounded-lg bg-brand/20 text-brand text-xs font-medium hover:bg-brand/30 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            {distributing === c.id ? 'Distribuindo…' : 'Distribuir'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {((tab === 'drivers' && drivers?.drivers.length === 0) ||
              (tab === 'companies' && companies?.companies.length === 0) ||
              (tab === 'campaigns' && campaigns?.campaigns.length === 0)) && (
              <div className="px-5 py-10 text-center text-white/35 text-sm">
                Nenhum registro
                {Object.keys(activeFilters).length > 0 ? ' com esses filtros' : ' ainda'}.
              </div>
            )}
          </div>
        </div>

        {loading && <div className="text-white/40 text-sm text-center">Atualizando…</div>}
      </main>
    </div>
  );
}
