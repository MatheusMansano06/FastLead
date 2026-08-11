import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useMercadopagoCheckout } from '../../hooks/useMercadopagoCheckout';

export default function OnboardingFinanceiroEmpresa() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const { startCheckout, loading: checkoutLoading, error: checkoutError } = useMercadopagoCheckout();

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const response = await apiClient.get('/billing/balance');
        setBalance(response.data.balance);
      } catch (error) {
        console.error('Erro ao carregar saldo:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, []);

  const handleAddCredit = async (amount) => {
    if (amount <= 0) return;
    await startCheckout(amount);
  };

  const presets = [50, 100, 250, 500];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F6FA] to-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-grotesk text-4xl font-bold text-ink mb-2">
            Sua carteira FastLead
          </h1>
          <p className="text-ink/60 text-lg">
            Adicione crédito para criar anúncios e pagar por leads
          </p>
        </div>

        {/* Card de saldo */}
        <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-lg p-8 mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink/45">
            Saldo disponível
          </p>
          <p className="font-grotesk text-5xl font-bold text-ink mt-2">
            R$ {balance.toFixed(2).replace('.', ',')}
          </p>

          {balance === 0 && (
            <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-900">
                Você não tem crédito. Adicione uma quantidade para começar a publicar anúncios.
              </p>
            </div>
          )}
        </div>

        {/* Botão principal */}
        {!showAddCredit ? (
          <button
            onClick={() => setShowAddCredit(true)}
            className="w-full bg-brand text-white font-bold py-3 rounded-lg mb-4 hover:bg-[#1d51d8] transition"
          >
            {balance > 0 ? 'Adicionar mais crédito' : 'Adicionar crédito agora'}
          </button>
        ) : (
          <>
            {/* Opções de valor rápido */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-ink mb-3">Valores rápidos:</p>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAddCredit(amount)}
                    disabled={checkoutLoading}
                    className="p-3 rounded-lg border border-ink/[0.07] hover:bg-blue-50 font-semibold text-ink transition disabled:opacity-50"
                  >
                    R$ {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Input customizado */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-ink block mb-2">
                Ou digite um valor:
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-3 text-ink/60">R$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 border border-ink/[0.07] rounded-lg"
                  />
                </div>
                <button
                  onClick={() => handleAddCredit(parseFloat(customAmount))}
                  disabled={checkoutLoading || !customAmount}
                  className="px-6 bg-brand text-white font-bold rounded-lg hover:bg-[#1d51d8] disabled:opacity-50 transition"
                >
                  {checkoutLoading ? 'Processando...' : 'Continuar'}
                </button>
              </div>
            </div>

            {checkoutError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 mb-4">
                {checkoutError}
              </div>
            )}

            {/* Botão pular */}
            {balance > 0 && (
              <button
                onClick={() => navigate('/app/empresa')}
                className="w-full text-ink/60 py-2 font-semibold hover:text-ink transition"
              >
                Continuar sem adicionar agora
              </button>
            )}
          </>
        )}

        {/* Info de segurança */}
        <div className="mt-12 text-center text-sm text-ink/50">
          <p>🔒 Pagamentos processados seguramente via Mercado Pago</p>
          <p>Seu cartão nunca é armazenado nos nossos servidores</p>
        </div>
      </div>
    </div>
  );
}
