import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

/**
 * Landing que o passageiro vê depois de escanear o QR do tablet.
 *
 * O scan já foi contado no backend antes do redirect — esta página existe
 * para fechar o funil: transformar um alcance anônimo em contato.
 * Precisa carregar rápido em 4G ruim e caber numa mão só.
 */

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function LeadCapture() {
  const { campaignId } = useParams();
  const [params] = useSearchParams();
  const scanEventId = params.get('s');

  const [campaign, setCampaign] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/meta/campaign/${campaignId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Campanha não encontrada'))))
      .then((j) => setCampaign(j.data))
      .catch(() => setCampaign(null));
  }, [campaignId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email && !form.phone) {
      setError('Informe seu e-mail ou telefone');
      return;
    }
    setState('sending');
    setError('');
    try {
      const res = await fetch(`${API}/r/${scanEventId}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao enviar');
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-mint/20 border-2 border-mint flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-mint" viewBox="0 0 24 24" fill="none" strokeWidth="3" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-3">Prontinho!</h1>
        <p className="text-white/60 text-lg max-w-sm">
          {campaign?.advertiser || 'A empresa'} vai entrar em contato com você em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="text-mint text-xs font-semibold uppercase tracking-widest mb-2">
          {campaign?.advertiser || 'FastLead'}
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3">
          {campaign?.title || 'Deixe seu contato'}
        </h1>
        {campaign?.description && (
          <p className="text-white/60 mb-6 leading-relaxed">{campaign.description}</p>
        )}

        {campaign?.imageUrl && (
          <img src={campaign.imageUrl} alt="" className="rounded-2xl mb-6 w-full object-cover max-h-48" />
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 text-lg focus:outline-none focus:border-brand"
          />
          <input
            type="email"
            inputMode="email"
            placeholder="Seu e-mail"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 text-lg focus:outline-none focus:border-brand"
          />
          <input
            type="tel"
            inputMode="tel"
            placeholder="Seu WhatsApp"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 text-lg focus:outline-none focus:border-brand"
          />

          {error && <div className="text-red-300 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={state === 'sending'}
            className="mt-2 w-full py-4 rounded-xl bg-brand hover:bg-brand/90 disabled:opacity-50 font-semibold text-lg transition-colors"
          >
            {state === 'sending' ? 'Enviando…' : 'Quero saber mais'}
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-6">
          Seus dados vão só para {campaign?.advertiser || 'o anunciante'}.
        </p>
      </div>
    </div>
  );
}
