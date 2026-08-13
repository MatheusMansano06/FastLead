import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nf = new Intl.NumberFormat('pt-BR');

export function AdminCompanies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(`/admin/companies?page=${page}&limit=${limit}`);
        setCompanies(res.data.data.companies);
        setTotal(res.data.data.total);
      } catch (e) {
        console.error('Erro ao carregar empresas:', e);
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
            <h1 className="text-4xl font-bold mb-2">Empresas</h1>
            <p className="text-white/60">Gerenciar anunciantes e campanhas</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-6 py-2 rounded-lg bg-white/10 text-white/60 hover:text-white transition"
          >
            ← Voltar
          </button>
        </div>

        {/* Stats Summary */}
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
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Por página</div>
            <div className="text-3xl font-bold">{limit}</div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-white/60">Carregando...</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-white/60">Nenhuma empresa encontrada</div>
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Empresa</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Contato</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Orçamento</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Gasto</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Leads</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Ação</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                    onClick={() => navigate(`/admin/companies/${company.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium">{company.tradeName || company.companyName}</div>
                      <div className="text-xs text-white/40">{company.industry}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{company.contactName}</div>
                      <div className="text-xs text-white/40">{company.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{brl(company.totalBudget)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{brl(company.totalSpent)}</div>
                      <div className="text-xs text-white/40">
                        {((company.totalSpent / company.totalBudget) * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{nf.format(company.metrics.leads)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/companies/${company.id}`);
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

export default AdminCompanies;
