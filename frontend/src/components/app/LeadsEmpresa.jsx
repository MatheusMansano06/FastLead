import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROTULO_STATUS = {
  PENDING: 'Em aberto',
  CONVERTED: 'Virou venda',
  INVALID: 'Descartado',
};

const COR_STATUS = {
  PENDING: 'bg-[#FFFAEB] text-[#B54708]',
  CONVERTED: 'bg-[#ECFDF3] text-[#067647]',
  INVALID: 'bg-[#F2F4F7] text-[#0B1D3A]/50',
};

/**
 * Lista os leads da empresa e permite marcar um como venda fechada.
 *
 * É o único lugar do produto que dispara dinheiro: converter debita a comissão
 * da empresa e credita o motorista. Sem esta tela o endpoint de conversão
 * existia mas ninguém conseguia chamá-lo, e nenhum motorista recebia nada.
 */
export default function LeadsEmpresa({ onConvertido }) {
  const [leads, setLeads] = useState(null);
  const [total, setTotal] = useState(0);
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [convertendo, setConvertendo] = useState(null); // lead sendo convertido
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await apiClient.getLeads(50, 0, filtro || undefined);
      setLeads(r.leads);
      setTotal(r.total);
      setErro('');
    } catch {
      setErro('Não foi possível carregar os leads.');
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const confirmarVenda = async () => {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) return;

    setSalvando(true);
    setErro('');
    setAviso('');
    try {
      const r = await apiClient.convertLead(convertendo.id, n);
      setAviso(
        `Venda de ${brl(r.conversion_value)} registrada. ` +
          `Comissão creditada ao motorista; seu saldo agora é ${brl(r.saldo_empresa)}.`,
      );
      setConvertendo(null);
      setValor('');
      carregar();
      onConvertido?.();
    } catch (e) {
      const d = e?.response?.data;
      const detalhe = [d?.message, d?.error].find((m) => m && m !== 'Error');
      setErro(detalhe || 'Não foi possível registrar a venda.');
    } finally {
      setSalvando(false);
    }
  };

  const FILTROS = [
    { k: '', label: 'Todos' },
    { k: 'PENDING', label: 'Em aberto' },
    { k: 'CONVERTED', label: 'Viraram venda' },
  ];

  return (
    <div className="space-y-4">
      {erro && (
        <div className="rounded-lg border border-[#FECDCA] bg-[#FFFBFA] px-4 py-3 text-sm text-[#B42318]">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="rounded-lg border border-[#ABEFC6] bg-[#F6FEF9] px-4 py-3 text-sm text-[#067647]">
          {aviso}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(f.k)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              filtro === f.k
                ? 'bg-[#2563FF0F] text-[#2563FF]'
                : 'border border-[#E4E7EC] bg-white text-[#0B1D3A]/70 hover:bg-[#F7F8FA]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#0B1D3A]/45">
          {leads == null ? '' : `${total} lead${total === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        {leads == null ? (
          <p className="px-6 py-10 text-center text-sm text-[#0B1D3A]/45">Carregando…</p>
        ) : leads.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#0B1D3A]/45">
            Nenhum lead ainda. Eles aparecem quando um passageiro escaneia o QR do
            seu anúncio.
          </p>
        ) : (
          <ul className="divide-y divide-[#E4E7EC]">
            {leads.map((l) => (
              <li key={l.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {l.contactName || l.contactEmail || l.contactPhone || 'Sem contato'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          COR_STATUS[l.status] || ''
                        }`}
                      >
                        {ROTULO_STATUS[l.status] || l.status}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-xs text-[#0B1D3A]/50">
                      {l.campaignTitle || 'Campanha removida'}
                      {l.motoristaName && ` · motorista ${l.motoristaName}`}
                      {' · '}
                      {new Date(l.scanTime).toLocaleDateString('pt-BR')}
                    </p>

                    {(l.contactEmail || l.contactPhone) && (
                      <p className="mt-0.5 truncate text-xs text-[#0B1D3A]/45">
                        {[l.contactEmail, l.contactPhone].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    {l.status === 'CONVERTED' ? (
                      <p className="text-sm font-bold text-[#067647]">
                        {l.conversionValue == null ? '—' : brl(l.conversionValue)}
                      </p>
                    ) : (
                      <button
                        onClick={() => {
                          setConvertendo(l);
                          setValor('');
                          setAviso('');
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2 text-sm font-medium text-[#0B1D3A]/75 transition hover:border-[#2563FF] hover:text-[#2563FF]"
                      >
                        Marcar venda
                      </button>
                    )}
                  </div>
                </div>

                {convertendo?.id === l.id && (
                  <div className="mt-3 rounded-lg bg-[#F7F8FA] p-4">
                    <p className="text-xs font-semibold text-[#0B1D3A]/70">
                      Por quanto você fechou esta venda?
                    </p>
                    <p className="mt-1 text-xs text-[#0B1D3A]/45">
                      A comissão do motorista sai deste valor e é descontada do seu
                      saldo. Não dá para desfazer.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        autoFocus
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        placeholder="Valor da venda"
                        className="w-44 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-[#0B1D3A]/35 focus:border-[#2563FF] focus:ring-2 focus:ring-[#2563FF22]"
                      />
                      <button
                        disabled={salvando || !valor}
                        onClick={confirmarVenda}
                        className="inline-flex items-center justify-center rounded-lg bg-[#2563FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d54e0] disabled:opacity-60"
                      >
                        {salvando ? 'Registrando…' : 'Confirmar venda'}
                      </button>
                      <button
                        onClick={() => setConvertendo(null)}
                        className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-[#0B1D3A]/50 transition hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
