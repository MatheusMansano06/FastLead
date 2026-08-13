import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

const nf = new Intl.NumberFormat('pt-BR');

export function AdminDrivers() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(`/admin/drivers?page=${page}&limit=${limit}`);
        setDrivers(res.data.data.drivers);
        setTotal(res.data.data.total);
      } catch (e) {
        console.error('Erro:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, limit]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Motoristas</h1>
            <p className="text-white/60">Gerenciar drivers e desempenho</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-6 py-2 rounded-lg bg-white/10 text-white/60 hover:text-white transition"
          >
            ← Voltar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Total</div>
            <div className="text-3xl font-bold">{total}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Página</div>
            <div className="text-3xl font-bold">{page} de {pages}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Rating Médio</div>
            <div className="text-3xl font-bold text-brand">
              {(drivers.reduce((s, d) => s + d.rating, 0) / Math.max(1, drivers.length)).toFixed(1)}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-white/60">Carregando...</div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12 text-white/60">Nenhum motorista encontrado</div>
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-white/60">Nome</th>
                  <th className="px-6 py-4 text-left font-medium text-white/60">Email</th>
                  <th className="px-6 py-4 text-left font-medium text-white/60">Cidade</th>
                  <th className="px-6 py-4 text-left font-medium text-white/60">Apps</th>
                  <th className="px-6 py-4 text-center font-medium text-white/60">Rating</th>
                  <th className="px-6 py-4 text-right font-medium text-white/60">Ganhos</th>
                  <th className="px-6 py-4 text-center font-medium text-white/60">Status</th>
                  <th className="px-6 py-4 text-right font-medium text-white/60">Ação</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                    onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium">{driver.name}</div>
                    </td>
                    <td className="px-6 py-4 text-white/60">{driver.email}</td>
                    <td className="px-6 py-4 text-white/60">
                      {driver.city}, {driver.state}
                    </td>
                    <td className="px-6 py-4 text-white/60 text-xs">
                      {driver.rideApps.map((a) => a.label).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-brand font-bold">{driver.rating.toFixed(1)}★</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {Number(driver.totalEarnings).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          driver.status === 'ATIVO' ? 'bg-mint/20 text-mint' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/drivers/${driver.id}`);
                        }}
                        className="px-4 py-2 rounded-lg bg-brand/20 text-brand hover:bg-brand/30 transition text-sm font-medium"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = Math.max(1, page - 2) + i;
                if (p > pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-lg transition ${
                      p === page ? 'bg-brand text-white' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(pages, page + 1))}
              disabled={page === pages}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Próximo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDrivers;
