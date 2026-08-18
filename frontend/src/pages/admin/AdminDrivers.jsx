import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import AdminShell from '../../components/admin/AdminShell';
import Paginacao from '../../components/admin/Paginacao';
import {
  Stat,
  Badge,
  Tabela,
  Linha,
  Celula,
  Vazio,
  Carregando,
  Erro,
  brl,
  nf,
} from '../../components/admin/ui';

/** Lista de motoristas de todas as empresas. Clicar na linha abre o detalhe. */
export function AdminDrivers() {
  const navigate = useNavigate();
  const [motoristas, setMotoristas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const limite = 50;

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        const res = await apiClient.masterDrivers({}, pagina, limite);
        setMotoristas(res.drivers);
        setTotal(res.total);
        setErro(null);
      } catch (e) {
        setErro(e?.response?.data?.error || 'Não consegui carregar os motoristas.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [pagina]);

  const paginas = Math.max(1, Math.ceil(total / limite));
  const ativos = motoristas.filter((m) => m.status === 'ATIVO').length;

  return (
    <AdminShell
      titulo="Motoristas"
      subtitulo="Quem roda os anúncios, onde e quanto já ganhou"
    >
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Cadastrados" valor={nf.format(total)} hint="em todas as empresas" />
        <Stat
          label="Ativos nesta página"
          valor={nf.format(ativos)}
          hint={`de ${motoristas.length} listados`}
          destaque
        />
        <Stat label="Página" valor={`${pagina} de ${paginas}`} />
      </div>

      {erro && (
        <div className="mb-4">
          <Erro>{erro}</Erro>
        </div>
      )}

      {carregando ? (
        <Carregando />
      ) : motoristas.length === 0 ? (
        <Vazio>Nenhum motorista cadastrado ainda.</Vazio>
      ) : (
        <>
          <Tabela
            colunas={['Motorista', 'Cidade', 'Apps', 'Nota', 'Ganhos', 'Situação', '']}
          >
            {motoristas.map((m) => (
              <Linha key={m.id} onClick={() => navigate(`/admin/drivers/${m.id}`)}>
                <Celula>
                  <div className="font-medium text-ink">{m.name}</div>
                  <div className="text-xs text-ink/40">{m.email}</div>
                </Celula>
                <Celula className="text-ink/60">
                  {m.city ? `${m.city}${m.state ? `/${m.state}` : ''}` : '—'}
                </Celula>
                <Celula className="text-xs text-ink/50">
                  {m.rideApps?.map((a) => a.label).join(', ') || '—'}
                </Celula>
                <Celula>
                  <span className="font-semibold tabular-nums text-ink">
                    {Number(m.rating).toFixed(1)}
                  </span>
                  <span className="text-ink/30"> ★</span>
                </Celula>
                <Celula className="font-medium tabular-nums">{brl(m.totalEarnings)}</Celula>
                <Celula>
                  <Badge tom={m.status === 'ATIVO' ? 'ok' : 'neutro'}>{m.status}</Badge>
                </Celula>
                <Celula className="text-right text-ink/30">›</Celula>
              </Linha>
            ))}
          </Tabela>

          <Paginacao pagina={pagina} paginas={paginas} onMudar={setPagina} />
        </>
      )}
    </AdminShell>
  );
}

export default AdminDrivers;
