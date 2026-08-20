import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { AUTH_THEMES } from '../../components/auth/AuthShell';
import Field from '../../components/auth/Field';
import PasswordField from '../../components/auth/PasswordField';
import SubmitButton from '../../components/auth/SubmitButton';
import { Stepper, WizardNav, NextButton, fieldStepMap } from '../../components/auth/Wizard';
import { useAuthStore, homePathFor } from '../../stores/authStore';
import { apiClient } from '../../services/api';
import {
  maskCNPJ, maskPhone, isValidCNPJ, isValidEmail, isCorporateEmail,
  isValidPhoneBR, isStrongPassword, onlyDigits, CARGOS_EMPRESA, SEGMENTOS_EMPRESA,
} from '../../lib/validation';

const t = AUTH_THEMES.empresa;

const EMPTY = {
  fullName: '', role: '', email: '', phone: '',
  companyName: '', tradeName: '', cnpj: '', industry: '', website: '',
  password: '', confirm: '', accept: false,
};

const STEPS = [
  { label: 'Responsável', title: 'Quem responde pela conta', fields: ['fullName', 'role', 'email', 'phone'] },
  { label: 'Empresa', title: 'Dados da empresa', fields: ['companyName', 'tradeName', 'cnpj', 'industry', 'website'] },
  { label: 'Segurança', title: 'Crie sua senha', fields: ['password', 'confirm', 'accept'] },
];
const STEP_OF = fieldStepMap(STEPS);
const LAST = STEPS.length - 1;

export default function CadastroEmpresa() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(() => new Set());
  const [cnpjCheck, setCnpjCheck] = useState({ status: 'idle', info: null }); // idle|loading|done|error

  // Consulta a Receita quando o CNPJ fica válido (debounce).
  useEffect(() => {
    if (!isValidCNPJ(form.cnpj)) {
      setCnpjCheck({ status: 'idle', info: null });
      return;
    }
    let active = true;
    setCnpjCheck({ status: 'loading', info: null });
    const id = setTimeout(async () => {
      try {
        const info = await apiClient.verifyCNPJ(onlyDigits(form.cnpj));
        if (active) setCnpjCheck({ status: 'done', info });
      } catch {
        if (active) setCnpjCheck({ status: 'error', info: null });
      }
    }, 600);
    return () => { active = false; clearTimeout(id); };
  }, [form.cnpj]);

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
    if (!form.fullName.trim() || form.fullName.trim().length < 3)
      e.fullName = 'Informe o nome do responsável';
    if (!form.role) e.role = 'Selecione o seu cargo na empresa';
    if (!isValidEmail(form.email)) e.email = 'E-mail inválido';
    if (!isValidPhoneBR(form.phone)) e.phone = 'Telefone com DDD inválido';
    if (!form.companyName.trim() || form.companyName.trim().length < 2)
      e.companyName = 'Informe a razão social';
    if (!isValidCNPJ(form.cnpj)) e.cnpj = 'CNPJ inválido — confira os números';
    if (!form.industry) e.industry = 'Selecione o segmento';
    if (form.website && !/^([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(form.website.replace(/^https?:\/\//, '')))
      e.website = 'Site inválido (ex.: suaempresa.com.br)';
    if (!isStrongPassword(form.password)) e.password = 'A senha não atende às regras de segurança';
    if (form.confirm !== form.password) e.confirm = 'As senhas não coincidem';
    if (!form.accept) e.accept = 'Você precisa aceitar os termos';
    return e;
  }, [form]);

  // Sinais de legitimidade (comprovação da empresa)
  const trust = useMemo(() => ([
    { label: 'CNPJ válido', ok: isValidCNPJ(form.cnpj) },
    { label: 'E-mail corporativo', ok: isCorporateEmail(form.email) },
    { label: 'Cargo informado', ok: Boolean(form.role) },
    { label: 'Telefone válido', ok: isValidPhoneBR(form.phone) },
    { label: 'Site oficial', ok: Boolean(form.website && !errors.website) },
  ]), [form, errors.website]);
  const trustScore = trust.filter((x) => x.ok).length;

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
      const u = await register({
        type: 'advertiser',
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone,
        companyName: form.companyName.trim(),
        tradeName: form.tradeName.trim(),
        cnpj: form.cnpj,
        role: form.role,
        industry: form.industry,
        website: form.website.trim(),
      });
      navigate(homePathFor(u.type));
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
          Passo {step + 1} de {STEPS.length} · <strong>verificamos a autenticidade</strong> do anunciante.
        </p>
      </div>

      <Stepper steps={STEPS} current={step} accent={t.accent} />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* ─── Passo 1 · Responsável ─── */}
        {step === 0 && (
          <>
            <Field label="Nome completo do responsável" name="fullName" value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)} placeholder="Ex.: Ana Martins"
              error={err('fullName')} accent={t.accent} autoComplete="name" />
            <Field as="select" label="Cargo na empresa" name="role" value={form.role}
              onChange={(e) => set('role', e.target.value)} error={err('role')} accent={t.accent}>
              <option value="">Selecione…</option>
              {CARGOS_EMPRESA.map((c) => <option key={c} value={c}>{c}</option>)}
            </Field>
            <Field label="E-mail corporativo" type="email" name="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="voce@suaempresa.com.br"
              error={err('email')}
              hint={!err('email') && form.email && !isCorporateEmail(form.email) ? 'Prefira um e-mail com domínio próprio da empresa.' : ''}
              accent={t.accent} autoComplete="email" />
            <Field label="Telefone comercial" name="phone" value={form.phone}
              onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(11) 91234-5678"
              error={err('phone')} accent={t.accent} inputMode="tel" autoComplete="tel" />
          </>
        )}

        {/* ─── Passo 2 · Empresa ─── */}
        {step === 1 && (
          <>
            <Field label="Razão social" name="companyName" value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)} placeholder="Empresa Exemplo LTDA"
              error={err('companyName')} accent={t.accent} />
            <Field label="Nome fantasia" name="tradeName" value={form.tradeName} optional
              onChange={(e) => set('tradeName', e.target.value)} placeholder="Marca / nome comercial" accent={t.accent} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CNPJ" name="cnpj" value={form.cnpj}
                onChange={(e) => set('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00"
                error={err('cnpj')} accent={t.accent} inputMode="numeric" />
              <Field as="select" label="Segmento" name="industry" value={form.industry}
                onChange={(e) => set('industry', e.target.value)} error={err('industry')} accent={t.accent}>
                <option value="">Selecione…</option>
                {SEGMENTOS_EMPRESA.map((s) => <option key={s} value={s}>{s}</option>)}
              </Field>
            </div>

            {/* Resultado da consulta à Receita */}
            {cnpjCheck.status === 'loading' && (
              <p className="flex items-center gap-2 text-xs text-ink/50">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                Consultando CNPJ na Receita…
              </p>
            )}
            {cnpjCheck.status === 'done' && cnpjCheck.info?.found && (
              <div className="rounded-xl border px-3.5 py-2.5 text-xs"
                style={cnpjCheck.info.active
                  ? { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }
                  : { background: '#fff7ed', borderColor: '#fed7aa', color: '#c2410c' }}>
                <span className="font-semibold">{cnpjCheck.info.razaoSocial}</span>
                {cnpjCheck.info.municipio && <> · {cnpjCheck.info.municipio}/{cnpjCheck.info.uf}</>}
                <br />Situação na Receita: <strong>{cnpjCheck.info.situacao}</strong>
                {cnpjCheck.info.active ? ' ✓' : ' — verifique a situação cadastral'}
              </div>
            )}
            {cnpjCheck.status === 'done' && cnpjCheck.info && cnpjCheck.info.found === false && (
              <p className="text-xs font-medium text-amber-600">CNPJ válido, mas não encontrado na Receita.</p>
            )}

            <Field label="Site oficial" name="website" value={form.website} optional
              onChange={(e) => set('website', e.target.value)} placeholder="suaempresa.com.br"
              hint="Ajuda a comprovar a autenticidade da empresa." error={err('website')} accent={t.accent} />
          </>
        )}

        {/* ─── Passo 3 · Segurança ─── */}
        {step === 2 && (
          <>
            {/* Resumo da verificação — fecha o cadastro mostrando o que já bate */}
            <div className="rounded-2xl border border-black/5 bg-[#f7f8fa] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/50">Verificação da empresa</span>
                <span className="text-xs font-bold" style={{ color: trustScore >= 4 ? '#16a34a' : t.accent }}>{trustScore}/5</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full transition-all" style={{ width: `${(trustScore / 5) * 100}%`, background: trustScore >= 4 ? '#16a34a' : t.accent }} />
              </div>
              <ul className="mt-2.5 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
                {trust.map((x) => (
                  <li key={x.label} className={`flex items-center gap-1.5 text-[11px] ${x.ok ? 'text-emerald-600' : 'text-ink/45'}`}>
                    {x.ok ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
                    ) : (<span className="inline-block h-[12px] w-[12px] rounded-full border border-ink/25" />)}
                    {x.label}
                  </li>
                ))}
              </ul>
            </div>

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
                <span>Declaro que represento esta empresa e aceito os <Link to="#" className="font-medium no-underline hover:underline" style={{ color: t.accent }}>Termos de Uso</Link> e a <Link to="#" className="font-medium no-underline hover:underline" style={{ color: t.accent }}>Política de Privacidade</Link>.</span>
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
              {isLoading ? 'Enviando…' : 'Criar conta da empresa'}
            </SubmitButton>
          )}
        </WizardNav>
      </form>

      <div className="mt-5 text-center text-sm text-ink/55">
        Já tem conta?{' '}
        <Link to="/entrar/empresa" className="font-semibold no-underline hover:underline" style={{ color: t.accent }}>Fazer login</Link>
      </div>
    </AuthShell>
  );
}
