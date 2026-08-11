import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import FormRegistroBanco from './FormRegistroBanco';

const ACCENT = '#0a9d6c';

const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROTULO_STATUS = {
  PENDING: 'A receber',
  PAID: 'Recebido',
  CANCELLED: 'Cancelado',
};

/**
 * A API devolve CPF e número da conta mascarados. Só os campos que voltam
 * inteiros podem ser prefilhados no formulário — reaproveitar os mascarados
 * salvaria a máscara por cima do dado real.
 */
const prefill = (conta) =>
  conta
    ? {
        bank_code: conta.bank_code,
        agency: conta.agency,
        account_type: conta.account_type,
        holder_name: conta.holder_name,
      }
    : {};

const ROTULO_CONTA = {
  PENDING_VERIFICATION: 'Em verificação',
  VERIFIED: 'Verificada',
  BLOCKED: 'Bloqueada',
};

export default function CarteiraMotorista() {
  const [saldo, setSaldo] = useState(null);
  const [ganhos, setGanhos] = useState(null);
  const [conta, setConta] = useState(undefined); // undefined = carregando, null = sem conta
  const [editandoConta, setEditandoConta] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [s, g, c] = await Promise.all([
        apiClient.getDriverWallet(),
        apiClient.getDriverEarnings(50),
        apiClient.getDriverBank(),
      ]);
      setSaldo(s);
      setGanhos(g);
      setConta(c);
      setErro('');
    } catch {
      setErro('Não foi possível carregar a carteira.');
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="space-y-5">
      {erro && (
        <div className="rounded-2xl bg-[#FFFBFA] px-5 py-4 text-sm text-[#B42318] ring-1 ring-[#FECDCA]">
          {erro}
        </div>
      )}

      {/* ── Saldo ── */}
      <div
        className="rounded-3xl p-7 text-white md:p-9"
        style={{ background: 'linear-gradient(140deg,#06281d 0%,#0a9d6c 100%)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          A receber
        </p>
        <p className="mt-1.5 font-grotesk text-5xl font-bold">
          {saldo == null ? '—' : brl(saldo.pendente)}
        </p>
        <p className="mt-2 max-w-md text-sm text-white/70">
          Você ganha comissão a cada lead que a empresa confirma como venda. O
          repasse cai na conta que você cadastrar aqui.
        </p>

        <div className="mt-6 flex flex-wrap gap-6 border-t border-white/15 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Já recebido
            </p>
            <p className="mt-0.5 font-grotesk text-xl font-bold">
              {saldo == null ? '—' : brl(saldo.pago)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Total acumulado
            </p>
            <p className="mt-0.5 font-grotesk text-xl font-bold">
              {saldo == null ? '—' : brl(saldo.total)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Conta para receber ── */}
      <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-grotesk text-base font-bold text-ink">
              Conta para receber
            </h3>
            <p className="mt-0.5 text-sm text-ink/55">
              É para onde o PIX do seu ganho é enviado.
            </p>
          </div>

          {conta && !editandoConta && (
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: `${ACCENT}15`, color: ACCENT }}
            >
              {ROTULO_CONTA[conta.status] || conta.status}
            </span>
          )}
        </div>

        <div className="mt-5">
          {conta === undefined ? (
            <p className="text-sm text-ink/45">Carregando…</p>
          ) : editandoConta || conta === null ? (
            <FormRegistroBanco
              defaultValues={prefill(conta)}
              onSuccess={() => {
                setEditandoConta(false);
                carregar();
              }}
            />
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="text-sm text-ink/75">
                <p className="font-semibold text-ink">{conta.holder_name}</p>
                <p className="mt-0.5">
                  Banco {conta.bank_code} · Ag. {conta.agency} · Conta {conta.account}
                </p>
                <p className="mt-0.5 text-ink/45">CPF {conta.cpf}</p>
              </div>
              <button
                onClick={() => setEditandoConta(true)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink/60 ring-1 ring-black/5 transition hover:text-ink"
              >
                Alterar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Extrato ── */}
      <div className="rounded-3xl bg-white ring-1 ring-black/5">
        <div className="px-6 py-4">
          <h3 className="font-grotesk text-base font-bold text-ink">Meus ganhos</h3>
        </div>

        {ganhos == null ? (
          <p className="px-6 py-10 text-center text-sm text-ink/45">Carregando…</p>
        ) : ganhos.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink/45">
            Você ainda não tem ganhos. Eles aparecem quando uma empresa confirma
            que um lead do seu tablet virou venda.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {ganhos.map((g) => (
              <li key={g.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {g.description || 'Lead convertido'}
                  </p>
                  <p className="truncate text-xs text-ink/45">
                    {new Date(g.created_at).toLocaleDateString('pt-BR')}
                    {g.paid_at &&
                      ` · pago em ${new Date(g.paid_at).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: ACCENT }}>
                    + {brl(g.amount)}
                  </p>
                  <p className="text-[11px] text-ink/40">
                    {ROTULO_STATUS[g.status] || g.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
