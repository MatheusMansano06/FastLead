import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

const ACCENT = '#0A9D6C';
const STAR = '★';

export default function AvaliacaoCampanha({ campaignId, jaParticipou, onClose }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [minhaAval, setMinhaAval] = useState(null);
  const [estrelas, setEstrelas] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setErro('');
    apiClient
      .getCampaignReviews(campaignId)
      .then((d) => {
        setDados(d);
        if (d.myReview) {
          setMinhaAval(d.myReview);
          setEstrelas(d.myReview.rating);
          setComentario(d.myReview.comment || '');
        }
      })
      .catch((e) => setErro(e?.message || 'Erro ao carregar avaliações'));
  }, [campaignId]);

  const enviar = async () => {
    if (!estrelas) {
      setErro('Escolha uma nota');
      return;
    }

    setEnviando(true);
    try {
      await apiClient.submitCampaignReview(campaignId, estrelas, comentario);
      setErro('');
      setMinhaAval({ rating: estrelas, comment: comentario });
      // Recarregar as avaliações
      const d = await apiClient.getCampaignReviews(campaignId);
      setDados(d);
    } catch (e) {
      setErro(e?.message || 'Erro ao salvar');
    } finally {
      setEnviando(false);
    }
  };

  if (!jaParticipou) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">Você precisa participar da campanha para avaliar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {dados?.stats && dados.stats.totalReviews > 0 && (
        <div className="rounded-2xl border border-ink/10 p-5">
          <div className="flex items-end gap-3">
            <div>
              <p className="text-4xl font-bold" style={{ color: ACCENT }}>
                {dados.stats.avgRating}
              </p>
              <p className="text-sm text-ink/55">de 5</p>
            </div>
            <div className="mb-1 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="text-lg"
                  style={{ color: i <= Math.round(dados.stats.avgRating) ? ACCENT : '#d1d5db' }}
                >
                  {STAR}
                </span>
              ))}
            </div>
            <p className="ml-auto text-sm text-ink/55">{dados.stats.totalReviews} avaliações</p>
          </div>
        </div>
      )}

      {/* Minha avaliação */}
      <div className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-semibold text-ink">Sua avaliação</p>

        {erro && (
          <div className="rounded-lg border border-[#FECDCA] bg-[#FFFBFA] px-3 py-2 text-sm text-[#B42318]">
            {erro}
          </div>
        )}

        <div className="flex gap-2">
          {['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map((r, i) => (
            <button
              key={r}
              onClick={() => setEstrelas(r)}
              disabled={enviando}
              className="text-2xl transition"
              style={{
                color: estrelas === r || i + 1 <= ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].indexOf(estrelas || '') + 1 ? ACCENT : '#d1d5db',
                opacity: enviando ? 0.5 : 1,
              }}
            >
              {STAR}
            </button>
          ))}
        </div>

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={enviando}
          placeholder="Deixe um comentário (opcional)"
          className="h-20 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm placeholder:text-ink/40 focus:border-ink/30 focus:outline-none disabled:opacity-50"
        />

        <button
          onClick={enviar}
          disabled={enviando || !estrelas}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          style={{ background: ACCENT }}
        >
          {enviando ? 'Salvando...' : minhaAval ? 'Atualizar avaliação' : 'Avaliar'}
        </button>
      </div>

      {/* Avaliações de outros */}
      {dados?.reviews && dados.reviews.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">Avaliações da comunidade</p>
          {dados.reviews
            .filter((r) => r.motoristaId !== apiClient.token) // Não mostra a minha de novo
            .map((r) => (
              <div key={r.id} className="rounded-xl border border-ink/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.motoristaName}</p>
                    <div className="mt-0.5 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const ratingMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
                        return (
                          <span
                            key={i}
                            className="text-sm"
                            style={{
                              color: i <= ratingMap[r.rating] ? ACCENT : '#d1d5db',
                            }}
                          >
                            {STAR}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-ink/40">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-ink/70">{r.comment}</p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
