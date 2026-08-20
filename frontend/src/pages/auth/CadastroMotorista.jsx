import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { AUTH_THEMES } from '../../components/auth/AuthShell';
import Field from '../../components/auth/Field';
import PasswordField from '../../components/auth/PasswordField';
import SubmitButton from '../../components/auth/SubmitButton';
import { Stepper, WizardNav, NextButton, fieldStepMap } from '../../components/auth/Wizard';
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

const STEPS = [
  { label: 'Seus dados', title: 'Quem é você', fields: ['fullName', 'cpf', 'phone', 'email', 'city'] },
  { label: 'Veículo', title: 'Seu carro e o app', fields: ['rideApp', 'vehicle', 'plate'] },
  { label: 'Segurança', title: 'Crie sua senha', fields: ['password', 'confirm', 'accept'] },
];
const STEP_OF = fieldStepMap(STEPS);
const LAST = STEPS.length - 1;

export default function CadastroMotorista() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(() => new Set());

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

  const stepHasErrors = (i) => STEPS[i].fields.some((f) => errors[f]);
  const err = (k) => (tried.has(STEP_OF[k]) ? errors[k] : '');

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (e) => {
    e.preventDefault();

    // Etapas intermediárias: o submit avança em vez de enviar.
    if (step < LAST) {
      setTried((prev) => new Set(prev).add(step));
      if (!stepHasErrors(step)) setStep(step + 1);
      return;
    }

    setTried(new Set(STEPS.map((_, i) => i)));
    const bad = STEPS.findIndex((_, i) => stepHasErrors(i));
    if (bad !== -1) { setStep(bad); return; }

    try {
      await register({
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

  return (
    <AuthShell theme={t}>
      <div className="mb-5">
        <span className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ background: t.accentSoft, color: t.accent }}>
          {t.label}
        </span>
        <h2 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-ink">{STEPS[step].title}</h2>
        <p className="mt-1.5 text-sm text-ink/55">
          Passo {step + 1} de {STEPS.length} · cadastro para receber o tablet FastLead.
        </p>
      </div>

      <Stepper steps={STEPS} current={step} accent={t.accent} />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* ─── Passo 1 · Dados pessoais ─── */}
        {step === 0 && (
          <>
            <Field label="Nome completo" name="fullName" value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)} placeholder="Ex.: Carlos Souza"
              error={err('fullName')} accent={t.accent} autoComplete="name" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CPF" name="cpf" value={form.cpf}
                onChange={(e) => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00"
                error={err('cpf')} accent={t.accent} inputMode="numeric" />
              <Field label="Celular (WhatsApp)" name="phone" value={form.phone}
                onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(11) 91234-5678"
                error={err('phone')} accent={t.accent} inputMode="tel" autoComplete="tel" />
            </div>
            <Field label="E-mail" type="email" name="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="voce@email.com"
              error={err('email')} accent={t.accent} autoComplete="email" />
            <Field label="Cidade onde você roda" name="city" value={form.city}
              onChange={(e) => set('city', e.target.value)} placeholder="Ex.: São Paulo - SP"
              error={err('city')} accent={t.accent} />
          </>
        )}

        {/* ─── Passo 2 · Veículo e app ─── */}
        {step === 1 && (
          <>
            <Field as="select" label="Principal app que você usa" name="rideApp" value={form.rideApp}
              onChange={(e) => set('rideApp', e.target.value)} error={err('rideApp')} accent={t.accent}>
              <option value="">Selecione…</option>
              {APPS_MOTORISTA.map((a) => <option key={a} value={a}>{a}</option>)}
            </Field>
            <Field label="Marca e modelo" name="vehicle" value={form.vehicle}
              onChange={(e) => set('vehicle', e.target.value)} placeholder="Ex.: Chevrolet Onix"
              error={err('vehicle')} accent={t.accent} />
            <Field label="Placa" name="plate" value={form.plate}
              onChange={(e) => set('plate', maskPlate(e.target.value))} placeholder="ABC-1234"
              error={err('plate')} accent={t.accent} />
          </>
        )}

        {/* ─── Passo 3 · Segurança ─── */}
        {step === 2 && (
          <>
            <PasswordField label="Senha" name="password" value={form.password}
              onChange={(e) => set('password', e.target.value)} placeholder="Crie uma senha forte"
              error={err('password')} accent={t.accent} autoComplete="new-password" />
            <PasswordField label="Confirmar senha" name="confirm" value={form.confirm} meter={false}
              onChange={(e) => set('confirm', e.target.value)} placeholder="Repita a senha"
              error={err('confirm')} accent={t.accent} autoComplete="new-password" />

            <div>
              <label className="flex items-start gap-3 text-[13px] leading-snug text-ink/70">
                <input type="checkbox" checked={form.accept} onChange={(e) => set('accept', e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20" style={{ accentColor: t.accent }} />
                <span>Aceito os <Link to="#" className="font-medium no-underline hover:underline" style={{ color: t.accent }}>Termos do Parceiro</Link> e autorizo a exibição de anúncios no tablet durante as corridas.</span>
              </label>
              {err('accept') && <p className="mt-1 text-xs font-medium text-red-500">{err('accept')}</p>}
            </div>
          </>
        )}

        <WizardNav step={step} onBack={back}>
          {step < LAST ? (
            <NextButton accent={t.accent} glow={t.glow} />
          ) : (
            <SubmitButton loading={isLoading} accent={t.accent} glow={t.glow}>
              {isLoading ? 'Enviando…' : 'Quero ser parceiro'}
            </SubmitButton>
          )}
        </WizardNav>
      </form>

      <div className="mt-5 text-center text-sm text-ink/55">
        Já é parceiro?{' '}
        <Link to="/entrar/motorista" className="font-semibold no-underline hover:underline" style={{ color: t.accent }}>Fazer login</Link>
      </div>
    </AuthShell>
  );
}
