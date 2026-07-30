import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignStore } from '../stores/campaignStore';
import { useAuthStore } from '../stores/authStore';
import { Navbar, Sidebar, Button, Card, KPICard, Alert } from '../components';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { campaigns, analytics, fetchCampaigns, fetchAnalytics, isLoading, error } = useCampaignStore();
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalROI, setTotalROI] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchCampaigns();
    fetchAnalytics();
  }, [isAuthenticated, navigate, fetchCampaigns, fetchAnalytics]);

  useEffect(() => {
    if (campaigns.length > 0) {
      const leads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
      const roi = campaigns.reduce((sum, c) => sum + (c.roi || 0), 0);
      setTotalLeads(leads);
      setTotalROI(roi);
    }
  }, [campaigns]);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

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
                Dashboard Anunciante
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Bem-vindo! Acompanhe suas campanhas em tempo real
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

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KPICard
              title="Campanhas Ativas"
              value={activeCampaigns.length}
              icon="📊"
              trend="up"
              change={activeCampaigns.length > 0 ? 12 : 0}
            />
            <KPICard
              title="Leads Gerados"
              value={totalLeads}
              icon="📞"
              trend="up"
              change={8.5}
            />
            <KPICard
              title="ROI Total"
              value={totalROI.toFixed(2)}
              suffix="%"
              icon="💰"
              trend={totalROI > 0 ? 'up' : 'down'}
              change={totalROI > 0 ? 15.3 : -5}
            />
          </div>

          {/* Campanhas Ativas */}
          <Card padding="lg" className="mb-8">
            <h2 className="text-heading-md font-display mb-6">
              Campanhas Ativas
            </h2>

            {activeCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Nenhuma campanha ativa no momento
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
                      <th className="pb-3 px-4">Campanha</th>
                      <th className="pb-3 px-4">Leads</th>
                      <th className="pb-3 px-4">ROI</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {activeCampaigns.slice(0, 5).map(campaign => (
                      <tr key={campaign.id} className="text-body-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-50">
                              {campaign.name}
                            </p>
                            <p className="text-body-sm text-neutral-500 dark:text-neutral-400">
                              {campaign.taxiCount} veículos
                            </p>
                          </div>
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
                          <span className="inline-block px-3 py-1 bg-success/20 text-success rounded-full text-body-sm font-medium">
                            Ativa
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/campaigns?id=${campaign.id}`)}
                            >
                              Detalhes
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeCampaigns.length > 5 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/campaigns')}
                >
                  Ver Todas as Campanhas ({campaigns.length})
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card padding="lg">
            <h2 className="text-heading-md font-display mb-4">
              Resumo de Performance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Visualizações
                </p>
                <p className="text-heading-sm font-display">
                  45.2K
                </p>
              </div>
              <div>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Cliques
                </p>
                <p className="text-heading-sm font-display">
                  1.2K
                </p>
              </div>
              <div>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Taxa de Cliques
                </p>
                <p className="text-heading-sm font-display">
                  2.67%
                </p>
              </div>
              <div>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Taxa de Conversão
                </p>
                <p className="text-heading-sm font-display">
                  15%
                </p>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
