import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/api';

const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nf = new Intl.NumberFormat('pt-BR');

export function AdminCompanyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [leadPage, setLeadPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const [compRes, finRes, leadRes] = await Promise.all([
          apiClient.get(`/admin/companies/${id}`),
          apiClient.get(`/admin/companies/${id}/financial`),
          apiClient.get(`/admin/companies/${id}/leads?page=1&limit=20`),
        ]);
        setCompany(compRes.data.data);
        setFinancial(finRes.data.data);
        setLeads(leadRes.data.data.leads);
      } catch (e) {
        console.error('Erro:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, leadPage]);

  if (loading) return <div className="min-h-screen bg-dark text-white flex items-center justify-center">Carregando...</div>;
  if (!company) return <div className="min-h-screen bg-dark text-white flex items-center justify-center">Empresa não encontrada</div>;

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/admin/companies')}
                className="text-white/40 hover:text-white transition"
              >
                ←
              </button>
              <div>
                <h1 className="text-4xl font-bold">{company.tradeName || company.companyName}</h1>
                <p className="text-white/60">{company.industry}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60">CNPJ</div>
            <div className="text-lg font-medium">{company.documentNumber}</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Campanhas</div>
            <div className="text-3xl font-bold">{company.metrics.campaigns}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Leads</div>
            <div className="text-3xl font-bold text-aqua">{nf.format(company.metrics.leads)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Conversões</div>
            <div className="text-3xl font-bold text-mint">{nf.format(company.metrics.conversions)}</div>
            <div className="text-xs text-white/40 mt-1">{company.metrics.conversionRate}%</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/50 text-xs uppercase tracking-widest mb-2">Orçamento</div>
            <div className="text-lg font-bold">{brl(company.totalBudget)}</div>
            <div className="text-xs text-white/40 mt-1">Gasto: {brl(company.totalSpent)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10">
          {['overview', 'campaigns', 'financial', 'leads'].map((t) => (
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
              {t === 'campaigns' && 'Campanhas'}
              {t === 'financial' && 'Financeiro'}
              {t === 'leads' && 'Leads'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="text-white/50 text-sm uppercase tracking-widest mb-4">Contato</div>
              <div>
                <div className="text-white/60 text-sm mb-1">Nome</div>
                <div className="font-medium mb-4">{company.contactName}</div>
                <div className="text-white/60 text-sm mb-1">Email</div>
                <div className="font-medium text-sm text-aqua break-all">{company.contactEmail}</div>
              </div>
            </div>

            {/* Financial Summary */}
            {financial && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="text-white/50 text-sm uppercase tracking-widest mb-4">Financeiro</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Orçamento</div>
                    <div className="font-bold">{brl(financial.credit.budget)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Gasto</div>
                    <div className="font-bold text-red-400">{brl(financial.credit.spent)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Disponível</div>
                    <div className="font-bold text-mint">{brl(financial.credit.available)}</div>
                  </div>
                  <div className="pt-2">
                    <div className="text-white/60 text-xs mb-2">Utilização</div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-brand h-2 rounded-full"
                        style={{ width: `${financial.credit.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings Summary */}
            {financial && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="text-white/50 text-sm uppercase tracking-widest mb-4">Ganhos</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Total</div>
                    <div className="font-bold">{brl(financial.earnings.total)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Pagos</div>
                    <div className="font-bold text-mint">{brl(financial.earnings.paid)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Pendentes</div>
                    <div className="font-bold text-yellow-400">{brl(financial.earnings.pending)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'campaigns' && (
          <div className="space-y-4">
            {company.campaigns?.length === 0 ? (
              <div className="text-center py-12 text-white/60">Nenhuma campanha</div>
            ) : (
              company.campaigns?.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg mb-2">{campaign.title}</div>
                      <div className="text-sm text-white/60">
                        {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('pt-BR') : '-'} a{' '}
                        {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase text-white/50 mb-1">{campaign.status}</div>
                      <div className="font-bold">{brl(campaign.investment)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'financial' && financial && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Descrição</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Valor</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-white/60">Saldo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-white/60">Data</th>
                </tr>
              </thead>
              <tbody>
                {financial.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${tx.type === 'DEBIT' ? 'text-red-400' : 'text-mint'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{tx.description}</td>
                    <td className="px-6 py-4 text-right font-medium">{brl(tx.amount)}</td>
                    <td className="px-6 py-4 text-right font-medium">{brl(tx.balanceAfter)}</td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'leads' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Contato</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Campanha</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Motorista</th>
                  <th className="px-6 py-3 text-left font-medium text-white/60">Data</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          lead.status === 'CONVERTED'
                            ? 'bg-mint/20 text-mint'
                            : lead.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">{lead.contactName}</td>
                    <td className="px-6 py-3 text-white/60">{lead.campaign}</td>
                    <td className="px-6 py-3 text-white/60">{lead.motorista}</td>
                    <td className="px-6 py-3 text-white/60">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCompanyDetail;
