import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import AdminShell from '../../components/admin/AdminShell';
import {
  Card,
  Badge,
  Botao,
  Tabela,
  Linha,
  Celula,
  Vazio,
  Carregando,
  Erro,
  Abas,
  dataHora,
} from '../../components/admin/ui';

/**
 * Fila de liberação de tablets.
 *
 * Duas coisas acontecem aqui, e são etapas diferentes do mesmo processo:
 * primeiro alguém confere se a selfie bate com o documento e aprova; depois,
 * na entrega em mãos, o sócio confere o código que o motorista mostra na tela
 * e registra qual aparelho saiu. Aprovar não entrega — só libera a retirada.
 */

const ABAS = [
  { key: 'PENDING', label: 'Para analisar' },
  { key: 'APPROVED', label: 'Aguardando retirada' },
  { key: 'DELIVERED', label: 'Entregues' },
  { key: 'REJECTED', label: 'Recusados' },
  { key: 'EXPIRED', label: 'Vencidos' },
];

const ORIGEM = {
  OWN_DEVICE: { rotulo: 'Aparelho próprio', tom: 'neutro' },
  FASTLEAD_LOAN: { rotulo: 'Comodato FastLead', tom: 'info' },
};

/** O que o operador faz nesta aba — some a dúvida de "e agora?". */
const INSTRUCAO = {
  PENDING: 'Abra cada pedido, compare a selfie com o documento e aprove ou recuse.',
  APPROVED: 'Aprovados esperando retirada. Na entrega, abra o pedido e confira o código.',
  DELIVERED: 'Tablets já entregues em mãos, com o aparelho registrado.',
  REJECTED: 'Recusados. O motorista pode corrigir e enviar de novo.',
  EXPIRED: 'Passaram das 48 horas sem retirada. O motorista precisa pedir de novo.',
};

function prazoRestante(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'vencido';
  const horas = Math.floor(ms / 3600_000);
  return horas >= 1 ? `${horas}h restantes` : `${Math.max(1, Math.floor(ms / 60_000))} min`;
}

/** Foto ampliável: documento pequeno demais não dá para conferir. */
function Foto({ label, src }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
          {label}
        </span>
        <button
          type="button"
          onClick={() => setAberta(true)}
          className="overflow-hidden rounded-xl border border-black/10 transition-colors hover:border-[#2563FF]"
        >
          <img src={src} alt={label} className="aspect-[4/3] w-full object-cover" />
        </button>
        <span className="text-[11px] text-ink/35">clique para ampliar</span>
      </div>

      {aberta && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setAberta(false)}
        >
          <img src={src} alt={label} className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

function Dado({ rotulo, valor }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/[0.05] py-2.5 text-sm last:border-0">
      <span className="text-ink/50">{rotulo}</span>
      <span className="text-right font-medium text-ink">{valor || '—'}</span>
    </div>
  );
}

/** Painel lateral: fotos, dados do cadastro e as ações da etapa atual. */
function Detalhe({ id, onFechar, onMudou }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const [motivo, setMotivo] = useState('');
  const [recusando, setRecusando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [serie, setSerie] = useState('');

  useEffect(() => {
    let vivo = true;
    apiClient
      .masterTabletRequestDetail(id)
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setErro('Não consegui carregar esta solicitação.'));
    return () => {
      vivo = false;
    };
  }, [id]);

  const agir = async (fn) => {
    setOcupado(true);
    setErro(null);
    try {
      await fn();
      onMudou();
      onFechar();
    } catch (e) {
      setErro(e?.response?.data?.error || e?.message || 'Não consegui concluir a ação.');
    } finally {
      setOcupado(false);
    }
  };

  const m = dados?.motorista;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-[#F6F7FB] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-grotesk text-2xl font-bold text-ink">Solicitação de tablet</h2>
            {dados && (
              <p className="mt-1 text-sm text-ink/50">
                {ORIGEM[dados.acquisition]?.rotulo} · {dados.attempt}ª tentativa
              </p>
            )}
          </div>
          <button
            onClick={onFechar}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-ink/50 transition-colors hover:text-ink"
          >
            Fechar
          </button>
        </div>

        {erro && (
          <div className="mb-4">
            <Erro>{erro}</Erro>
          </div>
        )}

        {!dados ? (
          <Carregando />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Comparação visual: é para isto que a tela existe. */}
            <Card>
              <h3 className="font-grotesk text-base font-bold text-ink">
                A pessoa é quem diz ser?
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                Compare o rosto com a foto do documento e confira se o nome bate.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Foto label="Rosto" src={dados.selfie_photo} />
                <Foto label="Documento — frente" src={dados.doc_front_photo} />
                <Foto label="Documento — verso" src={dados.doc_back_photo} />
              </div>
            </Card>

            <Card>
              <h3 className="font-grotesk text-base font-bold text-ink">Cadastro</h3>
              <div className="mt-3">
                <Dado rotulo="Nome" valor={m?.user?.name} />
                <Dado rotulo="E-mail" valor={m?.user?.email} />
                <Dado rotulo="CPF" valor={m?.cpf} />
                <Dado rotulo="Telefone" valor={m?.phone} />
                <Dado
                  rotulo="Cidade"
                  valor={m?.city ? `${m.city}${m.state ? `/${m.state}` : ''}` : null}
                />
                <Dado rotulo="Placa" valor={m?.license_plate} />
                <Dado rotulo="Veículo" valor={m?.vehicle_info} />
                <Dado rotulo="Cadastrado em" valor={dataHora(m?.created_at)} />
              </div>
            </Card>

            <Card>
              <h3 className="font-grotesk text-base font-bold text-ink">Pedido</h3>
              <div className="mt-3">
                <Dado rotulo="Enviado em" valor={dataHora(dados.created_at)} />
                {dados.contract_accepted_at && (
                  <>
                    <Dado
                      rotulo="Comodato aceito em"
                      valor={dataHora(dados.contract_accepted_at)}
                    />
                    <Dado rotulo="Assinatura digitada" valor={dados.contract_signature} />
                    <Dado rotulo="IP do aceite" valor={dados.contract_ip} />
                    <Dado rotulo="Versão do contrato" valor={dados.contract_version} />
                  </>
                )}
                {dados.reviewed_at && (
                  <>
                    <Dado rotulo="Analisado em" valor={dataHora(dados.reviewed_at)} />
                    <Dado rotulo="Analisado por" valor={dados.reviewed_by?.name} />
                  </>
                )}
                {dados.rejection_reason && (
                  <Dado rotulo="Motivo da recusa" valor={dados.rejection_reason} />
                )}
                {dados.delivered_at && (
                  <>
                    <Dado rotulo="Entregue em" valor={dataHora(dados.delivered_at)} />
                    <Dado rotulo="Aparelho" valor={dados.device_identifier} />
                  </>
                )}
              </div>
            </Card>

            {/* ---------- Ações da etapa ---------- */}
            {dados.status === 'PENDING' &&
              (!recusando ? (
                <div className="flex gap-3">
                  <Botao
                    className="flex-1"
                    disabled={ocupado}
                    onClick={() => agir(() => apiClient.approveTabletRequest(id))}
                  >
                    {ocupado ? 'Aprovando…' : 'Aprovar'}
                  </Botao>
                  <Botao variante="perigo" disabled={ocupado} onClick={() => setRecusando(true)}>
                    Recusar
                  </Botao>
                </div>
              ) : (
                <Card>
                  <h3 className="font-grotesk text-base font-bold text-ink">Recusar pedido</h3>
                  <label className="mt-3 block text-sm text-ink/60">
                    Motivo — o motorista vai ler exatamente isto
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    placeholder="Ex: a foto do verso do documento está ilegível"
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-[#2563FF]"
                  />
                  <div className="mt-3 flex gap-3">
                    <Botao
                      variante="perigo"
                      disabled={ocupado || motivo.trim().length < 3}
                      onClick={() => agir(() => apiClient.rejectTabletRequest(id, motivo.trim()))}
                    >
                      Confirmar recusa
                    </Botao>
                    <Botao variante="neutro" onClick={() => setRecusando(false)}>
                      Cancelar
                    </Botao>
                  </div>
                </Card>
              ))}

            {dados.status === 'APPROVED' && dados.acquisition === 'FASTLEAD_LOAN' && (
              <Card>
                <h3 className="font-grotesk text-base font-bold text-ink">Registrar entrega</h3>
                <p className="mt-1 text-sm text-ink/55">
                  Peça o código na tela do motorista e digite abaixo.{' '}
                  {prazoRestante(dados.withdrawal_expires_at)}.
                </p>

                <label className="mt-4 block text-sm font-medium text-ink/70">
                  Código de retirada
                </label>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="FL-XXXXXX"
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-mono tracking-widest text-ink outline-none transition-colors focus:border-[#2563FF]"
                />

                <label className="mt-4 block text-sm font-medium text-ink/70">
                  Número de série ou patrimônio do tablet
                </label>
                <input
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="O que identifica este aparelho"
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-[#2563FF]"
                />

                <Botao
                  className="mt-5 w-full"
                  disabled={ocupado || !codigo.trim() || !serie.trim()}
                  onClick={() =>
                    agir(() =>
                      apiClient.deliverTabletRequest(id, {
                        code: codigo.trim(),
                        deviceIdentifier: serie.trim(),
                      })
                    )
                  }
                >
                  {ocupado ? 'Registrando…' : 'Confirmar entrega'}
                </Botao>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminTabletRequests() {
  const [aba, setAba] = useState('PENDING');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [abertoId, setAbertoId] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setDados(await apiClient.masterTabletRequests(aba));
      setErro(null);
    } catch {
      setErro('Não consegui carregar a fila.');
    } finally {
      setCarregando(false);
    }
  }, [aba]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const itens = dados?.items ?? [];
  const contagem = dados?.countsByStatus ?? {};

  return (
    <AdminShell
      titulo="Liberar tablets"
      subtitulo="Confira identidade, aprove e registre a entrega em mãos"
      pendentes={contagem.PENDING ?? 0}
    >
      <Abas
        abas={ABAS.map((a) => ({ ...a, contagem: contagem[a.key] }))}
        ativa={aba}
        onChange={setAba}
      />

      <p className="-mt-2 mb-5 text-sm text-ink/50">{INSTRUCAO[aba]}</p>

      {erro && (
        <div className="mb-4">
          <Erro>{erro}</Erro>
        </div>
      )}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 ? (
        <Vazio>Nada nesta aba.</Vazio>
      ) : (
        <Tabela
          colunas={[
            'Motorista',
            'Origem do tablet',
            'Cidade',
            'Enviado',
            aba === 'APPROVED' ? 'Código de retirada' : 'Tentativa',
            '',
          ]}
        >
          {itens.map((r) => (
            <Linha key={r.id} onClick={() => setAbertoId(r.id)}>
              <Celula>
                <div className="font-medium text-ink">{r.motorista?.user?.name}</div>
                <div className="text-xs text-ink/40">{r.motorista?.cpf || '—'}</div>
              </Celula>
              <Celula>
                <Badge tom={ORIGEM[r.acquisition]?.tom}>{ORIGEM[r.acquisition]?.rotulo}</Badge>
              </Celula>
              <Celula>
                {r.motorista?.city
                  ? `${r.motorista.city}${r.motorista.state ? `/${r.motorista.state}` : ''}`
                  : '—'}
              </Celula>
              <Celula className="text-ink/50">{dataHora(r.created_at)}</Celula>
              <Celula>
                {aba === 'APPROVED' ? (
                  r.withdrawal_code ? (
                    <div>
                      <span className="font-mono font-semibold tracking-widest text-[#2563FF]">
                        {r.withdrawal_code}
                      </span>
                      <div className="text-xs text-ink/40">
                        {prazoRestante(r.withdrawal_expires_at)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-ink/35">sem retirada</span>
                  )
                ) : (
                  <span className="text-ink/50">{r.attempt}ª</span>
                )}
              </Celula>
              <Celula className="text-right text-ink/30">›</Celula>
            </Linha>
          ))}
        </Tabela>
      )}

      {abertoId && (
        <Detalhe id={abertoId} onFechar={() => setAbertoId(null)} onMudou={carregar} />
      )}
    </AdminShell>
  );
}

export default AdminTabletRequests;
