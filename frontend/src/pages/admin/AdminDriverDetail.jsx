import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/api';

const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nf = new Intl.NumberFormat('pt-BR');

export function AdminDriverDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [stats, setStats] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [drvRes, statRes, earRes, sesRes] = await Promise.all([
          apiClient.get(`/admin/drivers/${id}`),
          apiClient.get(`/admin/drivers/${id}/stats`),
          apiClient.get(`/admin/drivers/${id}/earnings?limit=10`),
          apiClient.get(`/admin/drivers/${id}/sessions?limit=10`),
        ]);
        setDriver(drvRes.data.data);
        setStats(statRes.data.data);
        setEarnings(earRes.data.data.earnings);
        setSessions(sesRes.data.data.sessions);
      } catch (e) {
        console.error('Erro:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert('Informe o motivo da suspensão');
      return;
    }
    setSuspending(true);
    try {
      await apiClient.post(`/admin/drivers/${id}/suspend`, { reason: suspendReason });
      alert('Motorista suspenso com sucesso');
      setSuspendReason('');
      // Recarregar dados
      const drvRes = await apiClient.get(`/admin/drivers/${id}`);
      setDriver(drvRes.data.data);
    } catch (e) {
      alert('Erro ao suspender motorista: ' + e.message);
    } finally {
      setSuspending(false);
    }
  };

  const handleActivate = async () => {
    try {
      await apiClient.post(`/admin/drivers/${id}/activate`);
      alert('Motorista ativado com sucesso');
      const drvRes = await apiClient.get(`/admin/drivers/${id}`);
      setDriver(drvRes.data.data);
    } catch (e) {
      alert('Erro ao ativar motorista: ' + e.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-dark text-white flex items-center justify-center">Carregando...</div>;
  if (!driver) return <div className="min-h-screen bg-dark text-white flex items-center justify-center">Motorista não encontrado</div>;

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/drivers')}
              className="text-white/40 hover:text-white transition text-2xl"
            >
              ←
            </button>
            <div>
              <h1 className="text-4xl font-bold">{driver.name}</h1>
              <p className="text-white/60">{driver.email}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-block px-4 py-2 rounded-lg font-medium text-sm ${
              driver.status === 'ATIVO' ? 'bg-mint/20 text-mint' : 'bg-red-500/20 text-red-400'
            }`}>
              {driver.status}
            </div>
            <div className="text-white/60 text-sm mt-2">Rating: <span className="text-brand font-bold">{driver.rating}★</span></div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Ganhos Totais</div>
            <div className="text-2xl font-bold">{brl(driver.totalEarnings)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Pendentes</div>
            <div className="text-2xl font-bold text-yellow-400">{brl(stats?.pendingEarnings || 0)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Horas Trabalhadas</div>
            <div className="text-2xl font-bold text-aqua">{stats?.stats.hoursWorked || 0}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Leads</div>
            <div className="text-2xl font-bold text-mint">{nf.format(stats?.stats.leadsGenerated || 0)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10">
          {['overview', 'earnings', 'sessions', 'actions'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-medium border-b-2 transition ${
                tab === t
                  ? 'border-brand text-brand'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {t === 'overview' && 'Visão Geral'}
              {t === 'earnings' && 'Ganhos'}
              {t === 'sessions' && 'Sessões'}
              {t === 'actions' && 'Ações'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-white/50 text-sm uppercase tracking-widest mb-4">Informações</div>
              <div className="space-y-4">
                <div>
                  <div className="text-white/60 text-sm mb-1">Cidade</div>
                  <div className="font-medium">{driver.city}, {driver.state}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-1">Região</div>
                  <div className="font-medium">{driver.region || '-'}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-1">Apps</div>
                  <div className="font-medium text-sm space-y-1">
                    {driver.rideApps.map((app) => (
                      <div key={app}>{app}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-1">Categorias</div>
                  <div className="font-medium text-sm space-y-1">
                    {driver.rideCategories.map((cat) => (
                      <div key={cat}>{cat}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-white/50 text-sm uppercase tracking-widest mb-4">Desempenho</div>
              <div className="space-y-3">
                <div>
                  <div className="text-white/60 text-sm mb-2">Taxa de Conversão</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                    <div
                      className="bg-mint h-2 rounded-full"
                      style={{ width: `${Math.min(100, stats.stats.conversionRate)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm">{stats.stats.conversionRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-2">Leads Únicos</div>
                  <div className="text-lg font-bold">{nf.format(stats.stats.leadsConverted)}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-2">Scans Únicos</div>
                  <div className="text-lg font-bold">{nf.format(stats.stats.uniqueScans)}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-2">Ganho/Lead</div>
                  <div className="text-lg font-bold text-brand">{brl(stats.stats.avgEarningPerLead)}</div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-white/50 text-sm uppercase tracking-widest mb-4">Métricas</div>
              <div className="space-y-3">
                <div>
                  <div className="text-white/60 text-sm">Sessões</div>
                  <div className="text-2xl font-bold">{stats.stats.sessionsCount}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm">Horas Trabalhadas</div>
                  <div className="text-2xl font-bold">{stats.stats.hoursWorked.toFixed(1)}h</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm">Total de Scans</div>
                  <div className="text-2xl font-bold">{nf.format(stats.stats.scans)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'earnings' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Valor</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Taxa</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Campanha</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Data</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((earning) => (
                  <tr key={earning.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-3 font-medium">{brl(earning.amount)}</td>
                    <td className="px-6 py-3">{(earning.commissionRate * 100).toFixed(1)}%</td>
                    <td className="px-6 py-3 text-white/60">{earning.campaign}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        earning.status === 'PAID' ? 'bg-mint/20 text-mint' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {earning.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-white/60">
                      {new Date(earning.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'sessions' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Dispositivo</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Início</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Fim</th>
                  <th className="px-6 py-3 text-center font-medium text-white/60">Duração</th>
                  <th className="px-6 py-3 text-right font-medium text-white/60">Scans</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-3 text-white/60">{session.deviceName}</td>
                    <td className="px-6 py-3 text-sm">
                      {new Date(session.startTime).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {session.endTime ? new Date(session.endTime).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {session.durationMinutes ? `${session.durationMinutes}min` : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{session.scans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'actions' && (
          <div className="space-y-6">
            {driver.status === 'ATIVO' ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h3 className="text-xl font-bold mb-4 text-red-400">Suspender Motorista</h3>
                <div className="space-y-4">
                  <textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Motivo da suspensão (obrigatório)..."
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-brand"
                    rows={4}
                  />
                  <button
                    onClick={handleSuspend}
                    disabled={suspending || !suspendReason.trim()}
                    className="w-full px-6 py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {suspending ? 'Suspendendo...' : 'Confirmar Suspensão'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h3 className="text-xl font-bold mb-4 text-mint">Ativar Motorista</h3>
                <p className="text-white/60 mb-4">Reativar este motorista no sistema</p>
                <button
                  onClick={handleActivate}
                  className="w-full px-6 py-3 rounded-lg bg-mint text-dark font-medium hover:bg-mint/90 transition"
                >
                  Ativar Motorista
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDriverDetail;
