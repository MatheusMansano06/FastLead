import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/app/AppHeader';
import AcessoTablet from '../../components/app/AcessoTablet';
import { apiClient } from '../../services/api';

/**
 * Perfil do motorista: foto, dados e — o que faz a plataforma funcionar —
 * a segmentação (onde ele roda, em quais apps, em quais modalidades).
 * É esse preenchimento que permite a empresa escolher o público que quer.
 *
 * Também é aqui que ele gera o código para parear o tablet do carro.
 */

const ACCENT = '#0a9d6c';
const AVATAR_PX = 256;

/**
 * Redimensiona a foto no próprio navegador antes de subir.
 * Sem isso, uma selfie de 4MB viraria uma data-URL gigante no banco.
 */
function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_PX;
        canvas.height = AVATAR_PX;
        const ctx = canvas.getContext('2d');
        // Corta o centro em quadrado — a foto é sempre exibida em círculo.
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_PX,
          AVATAR_PX
        );
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Não consegui ler essa imagem'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Não consegui ler esse arquivo'));
    reader.readAsDataURL(file);
  });
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3.5 py-1.5 text-sm transition-colors"
      style={
        active
          ? { background: `${ACCENT}15`, borderColor: ACCENT, color: ACCENT, fontWeight: 600 }
          : { background: '#fff', borderColor: 'rgba(0,0,0,0.10)', color: '#5b6472' }
      }
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(6,40,29,0.5)]">
      {title && <h2 className="font-grotesk text-lg font-bold text-ink">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-ink/50">{subtitle}</p>}
      <div className={title ? 'mt-5' : ''}>{children}</div>
    </section>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink/40">{hint}</span>}
    </label>
  );
}

const inputCls =
  'rounded-xl border border-black/10 bg-white px-4 py-3 text-ink placeholder-ink/30 outline-none transition-colors focus:border-[#0a9d6c]';

export default function PerfilMotorista() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [catalog, setCatalog] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    city: '',
    state: '',
    vehicleInfo: '',
    licensePlate: '',
    rideApps: [],
    rideCategories: [],
    avatarUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [pairing, setPairing] = useState(null);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    apiClient.getSegmentationCatalog().then(setCatalog).catch(() => {});
    apiClient
      .getDriverProfile()
      .then((p) =>
        setForm((f) => ({
          ...f,
          name: p.name || '',
          phone: p.phone || '',
          bio: p.bio || '',
          city: p.city || '',
          state: p.state || '',
          vehicleInfo: p.vehicleInfo || '',
          licensePlate: p.licensePlate || '',
          rideApps: p.rideApps || [],
          rideCategories: p.rideCategories || [],
          avatarUrl: p.avatarUrl || '',
        }))
      )
      .catch(() => {});
    apiClient.getDriverDevices().then(setDevices).catch(() => {});
  }, []);

  // Modalidades só das plataformas que ele marcou — evita "UberX" num motorista
  // que só roda 99, o que quebraria o filtro da empresa.
  const availableCategories = useMemo(() => {
    if (!catalog) return [];
    return catalog.rideCategories.filter((c) => form.rideApps.includes(c.app));
  }, [catalog, form.rideApps]);

  const toggleApp = (value) =>
    setForm((f) => {
      const rideApps = f.rideApps.includes(value)
        ? f.rideApps.filter((a) => a !== value)
        : [...f.rideApps, value];
      // Ao desmarcar um app, as modalidades dele saem junto.
      const validCats = (catalog?.rideCategories || [])
        .filter((c) => rideApps.includes(c.app))
        .map((c) => c.value);
      return {
        ...f,
        rideApps,
        rideCategories: f.rideCategories.filter((c) => validCats.includes(c)),
      };
    });

  const toggleCategory = (value) =>
    setForm((f) => ({
      ...f,
      rideCategories: f.rideCategories.includes(value)
        ? f.rideCategories.filter((c) => c !== value)
        : [...f.rideCategories, value],
    }));

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const avatarUrl = await fileToAvatarDataUrl(file);
      setForm((f) => ({ ...f, avatarUrl }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.updateDriverProfile(form);
      setMessage({ type: 'ok', text: 'Perfil salvo' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.error || err.message || 'Falha ao salvar',
      });
    } finally {
      setSaving(false);
    }
  };

  const generateCode = async () => {
    setMessage(null);
    try {
      setPairing(await apiClient.createPairingCode());
      setDevices(await apiClient.getDriverDevices());
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Falha ao gerar código' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-ink">
      <AppHeader
        accent={ACCENT}
        badge="Motorista parceiro"
        nav={['Início', 'Oportunidades', 'Meus anúncios']}
        active={null}
        onNav={() => navigate('/app/motorista')}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
        {/* Foto + identificação */}
        <Card>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative shrink-0"
              aria-label="Trocar foto do perfil"
            >
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt=""
                  className="h-28 w-28 rounded-full object-cover"
                  style={{ boxShadow: `0 0 0 4px ${ACCENT}33` }}
                />
              ) : (
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold"
                  style={{ background: `${ACCENT}18`, color: ACCENT, boxShadow: `0 0 0 4px ${ACCENT}33` }}
                >
                  {(form.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                Trocar foto
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />

            <div className="text-center sm:text-left">
              <h1 className="font-grotesk text-2xl font-bold text-ink">
                {form.name || 'Seu perfil'}
              </h1>
              <p className="text-sm text-ink/50">
                {[form.city, form.state].filter(Boolean).join(' · ') || 'Complete seus dados'}
              </p>
            </div>
          </div>
        </Card>

        {message && (
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={
              message.type === 'ok'
                ? { background: `${ACCENT}12`, borderColor: `${ACCENT}55`, color: ACCENT }
                : { background: '#fee2e2', borderColor: '#fca5a5', color: '#b91c1c' }
            }
          >
            {message.text}
          </div>
        )}

        <form onSubmit={save} className="flex flex-col gap-6">
          <Card title="Seus dados">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(11) 90000-0000"
                  />
                </Field>
              </div>

              <Field label="Sobre você" hint="Aparece para as empresas que escolhem motoristas">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Rodo de manhã na zona sul, carro sempre limpo…"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Veículo">
                  <input
                    className={inputCls}
                    value={form.vehicleInfo}
                    onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })}
                    placeholder="Toyota Corolla 2021 prata"
                  />
                </Field>
                <Field label="Placa">
                  <input
                    className={`${inputCls} uppercase`}
                    value={form.licensePlate}
                    onChange={(e) =>
                      setForm({ ...form, licensePlate: e.target.value.toUpperCase() })
                    }
                    placeholder="ABC1D23"
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card
            title="Onde e como você roda"
            subtitle="É por aqui que as empresas encontram você. Quanto mais completo, mais anúncios chegam."
          >
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Cidade">
                  <input
                    className={inputCls}
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </Field>
                <Field label="Estado">
                  <select
                    className={inputCls}
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {catalog?.states.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-ink/70">Em quais apps você roda?</div>
                <div className="flex flex-wrap gap-2">
                  {catalog?.rideApps.map((a) => (
                    <Chip
                      key={a.value}
                      active={form.rideApps.includes(a.value)}
                      onClick={() => toggleApp(a.value)}
                    >
                      {a.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-ink/70">
                  Modalidades que você atende
                </div>
                {form.rideApps.length === 0 ? (
                  <p className="text-sm text-ink/40">
                    Escolha um app acima para ver as modalidades.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((c) => (
                      <Chip
                        key={c.value}
                        active={form.rideCategories.includes(c.value)}
                        onClick={() => toggleCategory(c.value)}
                      >
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-xl px-6 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            {saving ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>

        <Card
          title="Tablet do carro"
          subtitle="Abra o endereço abaixo no aparelho do carro e digite o código. Sua senha não fica salva no tablet."
        >
          {/* Endereço antes do código, e sempre visível: encerrar a jornada
              desfaz o pareamento, então no dia seguinte o motorista precisa
              voltar ao site — e pode ter fechado a aba no meio. */}
          <AcessoTablet url={pairing?.tabletUrl} qrCode={pairing?.tabletUrlQrCode} className="mb-4" />

          {pairing ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <div
                className="font-grotesk text-5xl font-bold tabular-nums tracking-[0.25em]"
                style={{ color: ACCENT }}
              >
                {pairing.code}
              </div>
              <div className="text-sm text-ink/40">
                Válido por {pairing.expiresInMinutes} minutos
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={generateCode}
              className="rounded-xl border border-black/10 bg-white px-5 py-2.5 font-medium text-ink transition-colors hover:border-black/20"
            >
              Gerar código de pareamento
            </button>
          )}

          {devices.length > 0 && (
            <div className="mt-5 flex flex-col gap-2 border-t border-black/5 pt-4">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">{d.label || 'Tablet'}</span>
                    <span
                      className="rounded-md px-2 py-0.5 text-xs"
                      style={
                        d.status === 'ACTIVE'
                          ? { background: `${ACCENT}18`, color: ACCENT }
                          : { background: 'rgba(0,0,0,0.05)', color: '#8a94a3' }
                      }
                    >
                      {d.status === 'ACTIVE' ? 'pareado' : 'aguardando'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiClient.unpairDevice(d.id);
                      setDevices(await apiClient.getDriverDevices());
                    }}
                    className="text-ink/40 transition-colors hover:text-red-600"
                  >
                    Desvincular
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
