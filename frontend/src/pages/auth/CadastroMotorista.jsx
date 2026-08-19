import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { AUTH_THEMES } from '../../components/auth/AuthShell';
import Field from '../../components/auth/Field';
import PasswordField from '../../components/auth/PasswordField';
import SubmitButton from '../../components/auth/SubmitButton';
import { useAuthStore, homePathFor } from '../../stores/authStore';
import {
  maskCPF, maskPhone, maskPlate, isValidCPF, isValidEmail,
  isValidPhoneBR, isStrongPassword, APPS_MOTORISTA,
} from '../../lib/validation';

const t = AUTH_THEMES.motorista;

const EMPTY = {
  fullName: '', cpf: '', email: '', phone: '',
  city: '', rideApp: '', vehicle: '', plate: '',
  password: '', confirm: '', accept: false,
};

const PLATE_RE = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/; // antigo + Mercosul

export default function CadastroMotorista() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => () => clearError(), [clearError]);
  useEffect(() => {
    if (isAuthenticated && user) navigate(homePathFor(user.type), { replace: true });
  }, [isAuthenticated, user, navigate]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (error) clearError();
  };

  const errors = useMemo(() => {
    const e = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 3) e.fullName = 'Informe seu nome completo';
    if (!isValidCPF(form.cpf)) e.cpf = 'CPF inválido — confira os números';
    if (!isValidEmail(form.email)) e.email = 'E-mail inválido';
    if (!isValidPhoneBR(form.phone)) e.phone = 'Celular com DDD inválido';
    if (!form.city.trim() || form.city.trim().length < 2) e.city = 'Informe sua cidade';
    if (!form.rideApp) e.rideApp = 'Selecione o app que você usa';
    if (!form.vehicle.trim() || form.vehicle.trim().length < 3) e.vehicle = 'Informe marca e modelo';
    if (!PLATE_RE.test(form.plate.toUpperCase())) e.plate = 'Placa inválida (ABC-1234 ou ABC1D23)';
    if (!isStrongPassword(form.password)) e.password = 'A senha não atende às regras de segurança';
    if (form.confirm !== form.password) e.confirm = 'As senhas não coincidem';
    if (!form.accept) e.accept = 'Você precisa aceitar os termos';
    return e;
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      const u = await register({
        type: 'driver',
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone,
        cpf: form.cpf,
        city: form.city.trim(),
        rideApp: form.rideApp,
        vehicle: form.vehicle.trim(),
        plate: form.plate.toUpperCase(),
      });
      // Cadastro criado é só o e-mail; o que libera o tablet é a verificação
      // de identidade. Mandar para a home aqui deixaria o motorista batendo
      // numa recusa do backend ao tentar parear, sem saber o que faltou.
      navigate('/app/motorista/tablet');
    } catch {
      /* erro via store */
    }
  };

  const err = (k) => (submitted ? errors[k] : '');

  return (
    <AuthShell theme={t}>
      <div className="mb-7">
        <span className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ background: t.accentSoft, color: t.accent }}>
          {t.label}
        </span>
        <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-tight text-ink">Seja um motorista parceiro</h2>
        <p className="mt-2 text-sm text-ink/55">
          Cadastre-se para receber o tablet FastLead e faturar com cada anúncio exibido nas suas corridas.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        {/* Dados pessoais */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Seus dados</legend>
          <div data-error={Boolean(err('fullName'))}>
            <Field label="Nome completo" name="fullName" value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)} placeholder="Ex.: Carlos Souza"
              error={err('fullName')} accent={t.accent} autoComplete="name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-error={Boolean(err('cpf'))}>
              <Field label="CPF" name="cpf" value={form.cpf}
                onChange={(e) => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00"
                error={err('cpf')} accent={t.accent} inputMode="numeric" />
            </div>
            <div data-error={Boolean(err('phone'))}>
              <Field label="Celular (WhatsApp)" name="phone" value={form.phone}
                onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(11) 91234-5678"
                error={err('phone')} accent={t.accent} inputMode="tel" autoComplete="tel" />
            </div>
          </div>
          <div data-error={Boolean(err('email'))}>
            <Field label="E-mail" type="email" name="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="voce@email.com"
              error={err('email')} accent={t.accent} autoComplete="email" />
          </div>
          <div data-error={Boolean(err('city'))}>
            <Field label="Cidade onde você roda" name="city" value={form.city}
              onChange={(e) => set('city', e.target.value)} placeholder="Ex.: São Paulo - SP"
              error={err('city')} accent={t.accent} />
          </div>
        </fieldset>

        {/* Veículo / app */}
        <fieldset className="space-y-4 border-t border-black/5 pt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Veículo e aplicativo</legend>
          <div data-error={Boolean(err('rideApp'))}>
            <Field as="select" label="Principal app que você usa" name="rideApp" value={form.rideApp}
              onChange={(e) => set('rideApp', e.target.value)} error={err('rideApp')} accent={t.accent}>
              <option value="">Selecione…</option>
              {APPS_MOTORISTA.map((a) => <option key={a} value={a}>{a}</option>)}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div data-error={Boolean(err('vehicle'))}>
              <Field label="Marca e modelo" name="vehicle" value={form.vehicle}
                onChange={(e) => set('vehicle', e.target.value)} placeholder="Ex.: Chevrolet Onix"
                error={err('vehicle')} accent={t.accent} />
            </div>
            <div data-error={Boolean(err('plate'))}>
              <Field label="Placa" name="plate" value={form.plate}
                onChange={(e) => set('plate', maskPlate(e.target.value))} placeholder="ABC-1234"
                error={err('plate')} accent={t.accent} />
            </div>
          </div>
        </fieldset>

        {/* Senha */}
        <fieldset className="space-y-4 border-t border-black/5 pt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">Segurança</legend>
          <div data-error={Boolean(err('password'))}>
            <PasswordField label="Senha" name="password" value={form.password}
              onChange={(e) => set('password', e.target.value)} placeholder="Crie uma senha forte"
              error={err('password')} accent={t.accent} autoComplete="new-password" />
          </div>
          <div data-error={Boolean(err('confirm'))}>
            <PasswordField label="Confirmar senha" name="confirm" value={form.confirm} meter={false}
              onChange={(e) => set('confirm', e.target.value)} placeholder="Repita a senha"
              error={err('confirm')} accent={t.accent} autoComplete="new-password" />
          </div>
        </fieldset>

        {/* Termos */}
        <div data-error={Boolean(err('accept'))}>
          <label className="flex items-start gap-3 text-sm text-ink/70">
            <input type="checkbox" checked={form.accept} onChange={(e) => set('accept', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20" style={{ accentColor: t.accent }} />
            <span>Aceito os <Link to="#" className="font-medium no-underline hover:underline" style={{ color: t.accent }}>Termos do Parceiro</Link> e autorizo a exibição de anúncios no tablet durante as corridas.</span>
          </label>
          {err('accept') && <p className="mt-1 text-xs font-medium text-red-500">{err('accept')}</p>}
        </div>

        <SubmitButton loading={isLoading} accent={t.accent} glow={t.glow}>
          {isLoading ? 'Enviando…' : 'Quero ser parceiro'}
        </SubmitButton>
      </form>

      <div className="mt-6 border-t border-black/5 pt-6 text-center text-sm text-ink/55">
        Já é parceiro?{' '}
        <Link to="/entrar/motorista" className="font-semibold no-underline hover:underline" style={{ color: t.accent }}>Fazer login</Link>
      </div>
    </AuthShell>
  );
}
