import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLeadsStore } from '../stores/leadsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { Navbar, Sidebar, Button, Card, Alert } from '../components';

const Leads = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { leads, fetchLeads, isLoading, error } = useLeadsStore();
  const { campaigns } = useCampaignStore();
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchLeads();
  }, [isAuthenticated, navigate, fetchLeads]);

  const filteredLeads = filterCampaign === 'all'
    ? leads
    : leads.filter(l => l.campaignId === filterCampaign);

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return 0;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Campanha', 'Motorista', 'Data/Hora', 'Convertido'];
    const rows = sortedLeads.map(lead => [
      lead.id,
      lead.campaignName,
      lead.driverName,
      new Date(lead.timestamp).toLocaleString('pt-BR'),
      lead.converted ? 'Sim' : 'Não',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const convertedCount = sortedLeads.filter(l => l.converted).length;
  const conversionRate = sortedLeads.length > 0
    ? ((convertedCount / sortedLeads.length) * 100).toFixed(1)
    : 0;

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
                Leads Gerados
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Acompanhe todos os leads das suas campanhas
              </p>
            </div>
            {sortedLeads.length > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleExportCSV}
              >
                📥 Exportar CSV
              </Button>
            )}
          </div>

          {error && (
            <Alert
              type="error"
              message={error}
              className="mb-6"
            />
          )}

          {/* Filtros */}
          <Card padding="lg" className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-grow">
                <label className="text-body-sm font-medium text-neutral-900 dark:text-neutral-50 mr-4">
                  Filtrar por Campanha:
                </label>
                <select
                  value={filterCampaign}
                  onChange={(e) => setFilterCampaign(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Todas as Campanhas</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
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
                  <option value="recent">Mais Recentes</option>
                  <option value="oldest">Mais Antigos</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Estatísticas */}
          {sortedLeads.length > 0 && (
            <Card padding="lg" className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Total de Leads
                  </p>
                  <p className="text-heading-md font-display">
                    {sortedLeads.length}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Convertidos
                  </p>
                  <p className="text-heading-md font-display text-success">
                    {convertedCount}
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Taxa de Conversão
                  </p>
                  <p className="text-heading-md font-display">
                    {conversionRate}%
                  </p>
                </div>
                <div>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Não Convertidos
                  </p>
                  <p className="text-heading-md font-display text-warning">
                    {sortedLeads.length - convertedCount}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Tabela de Leads */}
          <Card padding="lg">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400">
                  Carregando leads...
                </p>
              </div>
            ) : sortedLeads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Nenhum lead encontrado
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/campaigns')}
                >
                  Ver Campanhas
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200 dark:border-neutral-800">
                    <tr className="text-left text-body-md font-semibold text-neutral-700 dark:text-neutral-300">
                      <th className="pb-4 px-4">Data/Hora</th>
                      <th className="pb-4 px-4">Campanha</th>
                      <th className="pb-4 px-4">Motorista</th>
                      <th className="pb-4 px-4">Status</th>
                      <th className="pb-4 px-4">ID do Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {sortedLeads.map(lead => (
                      <tr key={lead.id} className="text-body-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="py-4 px-4">
                          <span className="text-neutral-900 dark:text-neutral-50 font-medium">
                            {new Date(lead.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-neutral-900 dark:text-neutral-50">
                            {lead.campaignName}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-neutral-900 dark:text-neutral-50">
                            {lead.driverName}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-body-sm font-medium ${
                            lead.converted
                              ? 'bg-success/20 text-success'
                              : 'bg-warning/20 text-warning'
                          }`}>
                            {lead.converted ? '✓ Convertido' : '⏳ Aguardando'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-neutral-500 dark:text-neutral-400 text-body-sm font-mono">
                            {lead.id.substring(0, 12)}...
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Leads;
