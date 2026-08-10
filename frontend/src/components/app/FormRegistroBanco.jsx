import { useState } from 'react';
import { apiClient } from '../../services/api';

export default function FormRegistroBanco({ onSuccess, defaultValues = {} }) {
  const [form, setForm] = useState({
    cpf: defaultValues.cpf || '',
    bank_code: defaultValues.bank_code || '001',
    agency: defaultValues.agency || '',
    account: defaultValues.account || '',
    account_type: defaultValues.account_type || 'CHECKING',
    holder_name: defaultValues.holder_name || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/driver/bank', form);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar conta');
    } finally {
      setLoading(false);
    }
  };

  const banks = [
    { code: '001', name: 'Banco do Brasil' },
    { code: '033', name: 'Santander' },
    { code: '104', name: 'Caixa Econômica' },
    { code: '237', name: 'Bradesco' },
    { code: '341', name: 'Itaú' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-semibold text-ink block mb-1">CPF</label>
        <input
          type="text"
          placeholder="00000000000"
          value={form.cpf}
          onChange={(e) => setForm({ ...form, cpf: e.target.value })}
          className="w-full px-3 py-2 border border-ink/[0.07] rounded-lg"
        />
        <p className="text-xs text-ink/50 mt-1">Apenas números</p>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink block mb-1">Banco</label>
        <select
          value={form.bank_code}
          onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
          className="w-full px-3 py-2 border border-ink/[0.07] rounded-lg"
        >
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-ink block mb-1">Agência</label>
          <input
            type="text"
            placeholder="0000"
            value={form.agency}
            onChange={(e) => setForm({ ...form, agency: e.target.value })}
            className="w-full px-3 py-2 border border-ink/[0.07] rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-ink block mb-1">Conta</label>
          <input
            type="text"
            placeholder="00000000"
            value={form.account}
            onChange={(e) => setForm({ ...form, account: e.target.value })}
            className="w-full px-3 py-2 border border-ink/[0.07] rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink block mb-1">Tipo de conta</label>
        <select
          value={form.account_type}
          onChange={(e) => setForm({ ...form, account_type: e.target.value })}
          className="w-full px-3 py-2 border border-ink/[0.07] rounded-lg"
        >
          <option value="CHECKING">Conta corrente</option>
          <option value="SAVINGS">Conta poupança</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink block mb-1">Nome do titular</label>
        <input
          type="text"
          placeholder="Seu nome completo"
          value={form.holder_name}
          onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
          className="w-full px-3 py-2 border border-ink/[0.07] rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#00A86B] text-white font-bold py-3 rounded-lg hover:bg-[#00915c] disabled:opacity-50 transition"
      >
        {loading ? 'Salvando...' : 'Confirmar dados bancários'}
      </button>
    </form>
  );
}
