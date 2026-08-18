import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import AdminShell from '../../components/admin/AdminShell';
import { Card, Stat, Badge, Vazio, Carregando, Erro, nf } from '../../components/admin/ui';

/**
 * Visão geral do painel administrativo.
 *
 * A tela abre pelo que exige ação — pedidos de tablet esperando análise —
 * e só depois mostra os números do sistema. Antes ela abria por quatro
 * contadores e a fila de trabalho não aparecia em lugar nenhum.
 */

/**
 * Uma etapa do funil impressão→scan→lead. A barra usa a etapa anterior como
 * 100%: mostrar 3 leads contra 40 mil exibições numa escala só produziria três
 * barras invisíveis e uma cheia.
 */
function Etapa({ rotulo, valor, anterior, cor, explicacao }) {
  const proporcao = anterior > 0 ? (valor / anterior) * 100 : valor > 0 ? 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink/70">{rotulo}</span>
        <span className="font-grotesk text-lg font-bold tabular-nums text-ink">
          {nf.format(valor)}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.max(proporcao, valor > 0 ? 2 : 0)}%`, background: cor }}
        />
      </div>
      <p className="mt-1 text-xs text-ink/40">
        {anterior > 0 ? `${proporcao.toFixed(1)}% ${explicacao}` : explicacao}
      </p>
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [fila, setFila] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        // A fila entra junto com os números: é o que decide se o operador
        // precisa fazer algo agora ou só está conferindo o movimento.
        const [ov, pendentes] = await Promise.all([
          apiClient.masterOverview(),
          apiClient.masterTabletRequests('PENDING', 1, 5).catch(() => null),
        ]);
        setOverview(ov);
        setFila(pendentes);
        setErro(null);
      } catch (e) {
        setErro(e?.response?.data?.error || e.message || 'Não consegui carregar o painel.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const pendentes = fila?.total ?? 0;

  if (carregando) {
    return (
      <AdminShell titulo="Visão geral">
        <Carregando />
      </AdminShell>
    );
  }

  if (erro || !overview) {
    return (
      <AdminShell titulo="Visão geral">
        <Erro>{erro || 'Sem dados para mostrar.'}</Erro>
      </AdminShell>
    );
  }

  const { totals, funnel, rates } = overview;

  return (
    <AdminShell
      titulo="Visão geral"
      subtitulo="O que precisa da sua atenção e como o sistema está andando"
      pendentes={pendentes}
    >
      {/* ---------- O que exige ação ---------- */}
      <Card className="mb-6" padding="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-grotesk text-lg font-bold text-ink">Precisa de você</h2>
              {pendentes > 0 ? (
                <Badge tom="alerta">{pendentes} aguardando</Badge>
              ) : (
                <Badge tom="ok">tudo em dia</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-ink/55">
              {pendentes > 0
                ? 'Motoristas enviaram documentos e estão esperando liberação para rodar.'
                : 'Nenhum pedido de tablet esperando análise.'}
            </p>
          </div>
          {pendentes > 0 && (
            <button
              onClick={() => navigate('/admin/tablet-requests')}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: '#2563FF' }}
            >
              Analisar agora
            </button>
          )}
        </div>

        {pendentes > 0 && fila?.items?.length > 0 && (
          <ul className="mt-5 divide-y divide-black/[0.05] border-t border-black/[0.05]">
            {fila.items.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.motorista?.user?.name}
                  </p>
                  <p className="truncate text-xs text-ink/45">
                    {r.motorista?.city
                      ? `${r.motorista.city}${r.motorista.state ? `/${r.motorista.state}` : ''}`
                      : 'sem cidade'}
                  </p>
                </div>
                <Badge tom={r.acquisition === 'FASTLEAD_LOAN' ? 'info' : 'neutro'}>
                  {r.acquisition === 'FASTLEAD_LOAN' ? 'Comodato' : 'Aparelho próprio'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- Números do sistema ---------- */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Empresas"
          valor={nf.format(totals.companies)}
          hint="anunciantes cadastradas"
          onClick={() => navigate('/admin/companies')}
        />
        <Stat
          label="Motoristas ativos"
          valor={nf.format(totals.driversActive)}
          hint={`${nf.format(totals.driversTotal)} cadastrados no total`}
          onClick={() => navigate('/admin/drivers')}
        />
        <Stat
          label="Campanhas no ar"
          valor={nf.format(totals.campaignsActive)}
          hint="rodando agora"
        />
        <Stat
          label="Tablets pareados"
          valor={nf.format(totals.devicesPaired)}
          hint="telas disponíveis"
          destaque
        />
      </div>

      {/* ---------- Funil e taxas ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-grotesk text-lg font-bold text-ink">
            Do anúncio exibido ao lead
          </h2>
          <p className="mt-1 text-sm text-ink/50">Últimos 14 dias</p>

          <div className="mt-5 flex flex-col gap-5">
            <Etapa
              rotulo="Exibições"
              valor={funnel.impressions}
              anterior={0}
              cor="#0B1D3A"
              explicacao="anúncios que apareceram na tela"
            />
            <Etapa
              rotulo="Scans do QR"
              valor={funnel.scans}
              anterior={funnel.impressions}
              cor="#00B4D8"
              explicacao="das exibições viraram scan"
            />
            <Etapa
              rotulo="Leads"
              valor={funnel.leads}
              anterior={funnel.scans}
              cor="#00C98A"
              explicacao="dos scans deixaram contato"
            />
            <Etapa
              rotulo="Conversões"
              valor={funnel.conversions}
              anterior={funnel.leads}
              cor="#2563FF"
              explicacao="dos leads a empresa marcou como convertido"
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="font-grotesk text-lg font-bold text-ink">Esperando resposta</h2>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className="text-sm text-ink/55">Leads sem conversão marcada</p>
                <p className="font-grotesk mt-0.5 text-2xl font-bold tabular-nums text-ink">
                  {nf.format(Math.max(0, funnel.leads - funnel.conversions))}
                </p>
              </div>
              <div>
                <p className="text-sm text-ink/55">Motoristas parados</p>
                <p className="font-grotesk mt-0.5 text-2xl font-bold tabular-nums text-ink">
                  {nf.format(Math.max(0, totals.driversTotal - totals.driversActive))}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-grotesk text-lg font-bold text-ink">Taxas</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink/55">Scan por exibição</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {rates.scanRate.toFixed(2)}%
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink/55">Lead por scan</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {rates.leadRate.toFixed(2)}%
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink/55">Conversão por lead</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {rates.conversionRate.toFixed(2)}%
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {funnel.impressions === 0 && (
        <div className="mt-6">
          <Vazio>
            Nenhuma exibição nos últimos 14 dias — sem tablets rodando, o funil fica zerado.
          </Vazio>
        </div>
      )}
    </AdminShell>
  );
}

export default AdminDashboard;
