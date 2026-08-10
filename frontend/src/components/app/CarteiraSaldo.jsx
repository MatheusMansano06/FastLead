import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

export default function CarteiraSaldo() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [balRes, histRes] = await Promise.all([
          apiClient.get('/billing/balance'),
          apiClient.get('/billing/history?limit=10'),
        ]);

        setBalance(balRes.data.balance);
        setTransactions(histRes.data.transactions);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getTypeLabel = (type) => {
    const labels = {
      DEPOSIT: '➕ Depósito',
      CAMPAIGN_DEBIT: '📣 Anúncio criado',
      LEAD_PAYOUT: '💬 Lead convertido',
      REFUND: '↩️ Reembolso',
      ADJUSTMENT: '⚙️ Ajuste',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return 'text-green-600';
      case 'CAMPAIGN_DEBIT':
      case 'LEAD_PAYOUT':
        return 'text-red-600';
      default:
        return 'text-ink/60';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando carteira...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Saldo atual */}
      <div className="bg-gradient-to-br from-brand to-[#1d51d8] text-white rounded-2xl p-8">
        <p className="text-sm font-semibold opacity-90">Saldo disponível</p>
        <p className="font-grotesk text-4xl font-bold mt-2">
          R$ {balance.toFixed(2).replace('.', ',')}
        </p>

        <button
          onClick={() => navigate('/app/empresa/onboarding-financeiro')}
          className="mt-6 bg-white text-brand font-bold px-6 py-2 rounded-lg hover:bg-white/90 transition"
        >
          Adicionar crédito
        </button>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-ink/[0.07] p-6">
        <h3 className="font-grotesk font-bold text-lg text-ink mb-4">Histórico</h3>

        {transactions.length === 0 ? (
          <p className="text-center text-ink/50 py-8">Nenhuma transação ainda</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-[#F4F6FA] rounded-lg">
                <div className="flex-1">
                  <p className={`font-semibold ${getTypeColor(tx.type)}`}>
                    {getTypeLabel(tx.type)}
                  </p>
                  <p className="text-xs text-ink/50 mt-1">
                    {tx.campaign?.title || tx.lead?.id || tx.description}
                  </p>
                  <p className="text-xs text-ink/40 mt-1">
                    {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <p className={`font-bold text-lg ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'DEPOSIT' ? '+' : '-'} R${' '}
                  {Math.abs(parseFloat(tx.amount)).toFixed(2).replace('.', ',')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
