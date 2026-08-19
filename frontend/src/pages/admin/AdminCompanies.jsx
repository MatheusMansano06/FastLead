import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import AdminShell from '../../components/admin/AdminShell';
import Paginacao from '../../components/admin/Paginacao';
import {
  Stat,
  Tabela,
  Linha,
  Celula,
  Vazio,
  Carregando,
  Erro,
  brl,
  nf,
} from '../../components/admin/ui';

/** Lista de anunciantes: quanto puseram na carteira e quanto já gastaram. */
export function AdminCompanies() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const limite = 50;

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        const res = await apiClient.masterCompanies(pagina, limite);
        setEmpresas(res.companies);
        setTotal(res.total);
        setErro(null);
      } catch (e) {
        setErro(e?.response?.data?.error || 'Não consegui carregar as empresas.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [pagina]);

  const paginas = Math.max(1, Math.ceil(total / limite));
  const investido = empresas.reduce((s, c) => s + Number(c.totalSpent || 0), 0);

  return (
    <AdminShell titulo="Empresas" subtitulo="Anunciantes, carteira e o que já foi gasto">
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Cadastradas" valor={nf.format(total)} />
        <Stat label="Gasto nesta página" valor={brl(investido)} destaque />
        <Stat label="Página" valor={`${pagina} de ${paginas}`} />
      </div>

      {erro && (
        <div className="mb-4">
          <Erro>{erro}</Erro>
        </div>
      )}

      {carregando ? (
        <Carregando />
      ) : empresas.length === 0 ? (
        <Vazio>Nenhuma empresa cadastrada ainda.</Vazio>
      ) : (
        <>
          <Tabela colunas={['Empresa', 'Responsável', 'Carteira', 'Gasto', 'Leads', '']}>
            {empresas.map((c) => {
              const orcamento = Number(c.totalBudget || 0);
              const gasto = Number(c.totalSpent || 0);
              const usado = orcamento > 0 ? (gasto / orcamento) * 100 : 0;
              return (
                <Linha key={c.id} onClick={() => navigate(`/admin/companies/${c.id}`)}>
                  <Celula>
                    <div className="font-medium text-ink">{c.tradeName || c.companyName}</div>
                    <div className="text-xs text-ink/40">{c.industry || '—'}</div>
                  </Celula>
                  <Celula>
                    <div className="text-ink/80">{c.contactName || '—'}</div>
                    <div className="text-xs text-ink/40">{c.contactEmail}</div>
                  </Celula>
                  <Celula className="font-medium tabular-nums">{brl(orcamento)}</Celula>
                  <Celula>
                    <div className="font-medium tabular-nums text-ink">{brl(gasto)}</div>
                    {orcamento > 0 && (
                      <div className="text-xs text-ink/40">{usado.toFixed(1)}% da carteira</div>
                    )}
                  </Celula>
                  <Celula className="font-medium tabular-nums">
                    {nf.format(c.metrics?.leads ?? 0)}
                  </Celula>
                  <Celula className="text-right text-ink/30">›</Celula>
                </Linha>
              );
            })}
          </Tabela>

          <Paginacao pagina={pagina} paginas={paginas} onMudar={setPagina} />
        </>
      )}
    </AdminShell>
  );
}

export default AdminCompanies;
