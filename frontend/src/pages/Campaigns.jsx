import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCampaignStore } from '../stores/campaignStore';
import { Navbar, Sidebar, Button, Card, Alert } from '../components';

const Campaigns = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { campaigns, fetchCampaigns, updateCampaign, isLoading, error } = useCampaignStore();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCampaigns();
  }, [isAuthenticated, navigate, fetchCampaigns]);

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case 'leads':
        return (b.leads || 0) - (a.leads || 0);
      case 'roi':
        return (b.roi || 0) - (a.roi || 0);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handlePauseCampaign = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      await updateCampaign(id, { status: 'paused' });
    }
  };

  const handleResumeCampaign = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      await updateCampaign(id, { status: 'active' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-success/20 text-success';
      case 'paused':
        return 'bg-warning/20 text-warning';
      case 'completed':
        return 'bg-neutral-300/20 text-neutral-600 dark:text-neutral-400';
      default:
        return 'bg-neutral-200/20 text-neutral-600 dark:text-neutral-400';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativa',
      paused: 'Pausada',
      completed: 'Finalizada',
      draft: 'Rascunho',
    };
    return labels[status] || status;
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-heading-xl font-display mb-2">
                Minhas Campanhas
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Gerencie e acompanhe todas as suas campanhas
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/create-campaign')}
            >
              ➕ Nova Campanha
            </Button>
          </div>

          {error && (
            <Alert
              type="error"
              message={error}
              className="mb-6"
            />
          )}

          {/* Filtros e Ordenação */}
          <Card padding="lg" className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-grow">
                <label className="text-body-sm font-medium text-neutral-900 dark:text-neutral-50 mr-4">
                  Filtrar por Status:
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Todas</option>
                  <option value="active">Ativas</option>
                  <option value="paused">Pausadas</option>
                  <option value="completed">Finalizadas</option>
                </select>
              </div>

              <div className="flex-grow">
                <label className="text-body-sm font-medium text-neutral-900 dark:text-neutral-50 mr-4">
                  Ordenar por:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date">Data (Recentes)</option>
                  <option value="leads">Mais Leads</option>
                  <option value="roi">Maior ROI</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Tabela de Campanhas */}
          <Card padding="lg">
            {sortedCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Nenhuma campanha encontrada
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/create-campaign')}
                >
                  Criar Primeira Campanha
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200 dark:border-neutral-800">
                    <tr className="text-left text-body-md font-semibold text-neutral-700 dark:text-neutral-300">
                      <th className="pb-4 px-4">Campanha</th>
                      <th className="pb-4 px-4">Status</th>
                      <th className="pb-4 px-4">Leads</th>
                      <th className="pb-4 px-4">ROI</th>
                      <th className="pb-4 px-4">Orçamento</th>
                      <th className="pb-4 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {sortedCampaigns.map(campaign => (
                      <tr key={campaign.id} className="text-body-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-50">
                              {campaign.name}
                            </p>
                            <p className="text-body-sm text-neutral-500 dark:text-neutral-400">
                              {new Date(campaign.startDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-body-sm font-medium ${getStatusColor(campaign.status)}`}>
                            {getStatusLabel(campaign.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-neutral-900 dark:text-neutral-50">
                            {campaign.leads || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-medium ${campaign.roi > 0 ? 'text-success' : 'text-error'}`}>
                            {campaign.roi > 0 ? '+' : ''}{campaign.roi.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-neutral-900 dark:text-neutral-50 font-medium">
                            R$ {campaign.budget.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/leads?campaign=${campaign.id}`)}
                            >
                              Ver Leads
                            </Button>
                            {campaign.status === 'active' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePauseCampaign(campaign.id)}
                                disabled={isLoading}
                              >
                                Pausar
                              </Button>
                            ) : campaign.status === 'paused' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResumeCampaign(campaign.id)}
                                disabled={isLoading}
                              >
                                Retomar
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Resumo */}
          {sortedCampaigns.length > 0 && (
            <Card padding="lg" className="mt-6">
              <h3 className="text-body-md font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
                Resumo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Total de Campanhas
                  </p>
                  <p className="text-heading-sm font-display">
                    {sortedCampaigns.length}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Ativas
                  </p>
                  <p className="text-heading-sm font-display text-success">
                    {sortedCampaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Total de Leads
                  </p>
                  <p className="text-heading-sm font-display">
                    {sortedCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    ROI Médio
                  </p>
                  <p className="text-heading-sm font-display text-success">
                    {(sortedCampaigns.reduce((sum, c) => sum + (c.roi || 0), 0) / sortedCampaigns.length).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default Campaigns;
