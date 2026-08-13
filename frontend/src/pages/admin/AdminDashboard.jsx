import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const brlMaster = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, tsRes] = await Promise.all([
          apiClient.get('/admin/overview'),
          apiClient.get('/admin/timeseries?days=14'),
        ]);
        setOverview(ovRes.data.data);
        setTimeseries(tsRes.data.data);
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!user || user.type !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Acesso Negado</div>
          <div className="text-white/60 mb-6">Apenas administradores podem acessar este painel</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand/90"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mb-4 mx-auto"></div>
          <div>Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-red-400">Erro</div>
          <div className="text-white/60 mb-6">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand/90"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const { totals, funnel, rates } = overview;
  const scanRate = funnel.uniqueScans > 0 ? (funnel.scans / funnel.uniqueScans) * 100 : 0;

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-white/60">Visão completa do sistema FastLead</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat label="Empresas" value={totals.companies} hint="Anunciantes ativas" tone="brand" />
          <Stat
            label="Motoristas"
            value={totals.driversActive}
            hint={`${totals.driversTotal} total`}
            tone="aqua"
          />
          <Stat label="Campanhas" value={totals.campaignsActive} hint="Ativas" tone="mint" />
          <Stat label="Tablets" value={totals.devicesPaired} hint="Pareados" />
        </div>

        {/* Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-4">Funil 14 Dias</div>
            <div className="space-y-3">
              <div>
                <div className="text-white/60 text-sm mb-1">Exibições</div>
                <div className="text-2xl font-bold">{nf.format(funnel.impressions)}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">Scans QR</div>
                <div className="text-2xl font-bold text-aqua">{nf.format(funnel.scans)}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">Leads</div>
                <div className="text-2xl font-bold text-mint">{nf.format(funnel.leads)}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">Conversões</div>
                <div className="text-2xl font-bold text-brand">{nf.format(funnel.conversions)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-4">Taxas de Conversão</div>
            <div className="space-y-3">
              <div>
                <div className="text-white/60 text-sm mb-2">Scan Rate (QR/Impressão)</div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-aqua h-2 rounded-full"
                    style={{ width: `${Math.min(100, rates.scanRate * 2)}%` }}
                  ></div>
                </div>
                <div className="text-sm mt-1">{rates.scanRate.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-2">Lead Rate (Lead/Scan)</div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-mint h-2 rounded-full"
                    style={{ width: `${Math.min(100, rates.leadRate * 10)}%` }}
                  ></div>
                </div>
                <div className="text-sm mt-1">{rates.leadRate.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-2">Conversion Rate (Lead/Conversão)</div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-brand h-2 rounded-full"
                    style={{ width: `${Math.min(100, rates.conversionRate)}%` }}
                  ></div>
                </div>
                <div className="text-sm mt-1">{rates.conversionRate.toFixed(2)}%</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-4">Oportunidades</div>
            <div className="space-y-4">
              <div>
                <div className="text-white/60 text-sm mb-1">Leads Pendentes</div>
                <div className="text-2xl font-bold text-yellow-400">{nf.format(funnel.leads - funnel.conversions)}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm mb-1">Motoristas Inativos</div>
                <div className="text-2xl font-bold">{nf.format(totals.driversTotal - totals.driversActive)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/admin/companies')}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition text-left group"
          >
            <div className="text-white/50 text-sm mb-2 group-hover:text-white/70">Gerenciar</div>
            <div className="text-xl font-bold group-hover:text-brand transition">Empresas</div>
            <div className="text-white/40 text-sm mt-2">{totals.companies} anunciantes</div>
          </button>

          <button
            onClick={() => navigate('/admin/drivers')}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition text-left group"
          >
            <div className="text-white/50 text-sm mb-2 group-hover:text-white/70">Gerenciar</div>
            <div className="text-xl font-bold group-hover:text-aqua transition">Motoristas</div>
            <div className="text-white/40 text-sm mt-2">{totals.driversActive} ativos</div>
          </button>

          <button
            onClick={() => navigate('/admin/campaigns')}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition text-left group"
          >
            <div className="text-white/50 text-sm mb-2 group-hover:text-white/70">Monitorar</div>
            <div className="text-xl font-bold group-hover:text-mint transition">Campanhas</div>
            <div className="text-white/40 text-sm mt-2">{totals.campaignsActive} ativas</div>
          </button>

          <button
            onClick={() => navigate('/admin/payouts')}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition text-left group"
          >
            <div className="text-white/50 text-sm mb-2 group-hover:text-white/70">Processar</div>
            <div className="text-xl font-bold group-hover:text-brand transition">Repasses</div>
            <div className="text-white/40 text-sm mt-2">Pagamentos pendentes</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
