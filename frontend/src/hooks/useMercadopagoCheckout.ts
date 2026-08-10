import { useState } from 'react';
import { apiClient } from '../services/api';

export function useMercadopagoCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (amount: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/billing/checkout', { amount });
      const { checkout_url } = response.data;

      // Em produção: redireciona para Mercado Pago
      // Em mock: simula sucesso
      console.log('[MOCK] Redirecionando para checkout:', checkout_url);

      // Simular retorno aprovado após 2 segundos
      setTimeout(async () => {
        try {
          await apiClient.post('/billing/verify', { payment_id: `mock_${Date.now()}` });
          window.location.href = '/app/empresa?payment=success';
        } catch (err) {
          console.error('Erro ao verificar pagamento:', err);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar checkout');
      setLoading(false);
    }
  };

  return { startCheckout, loading, error };
}
