import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, homePathFor } from '../../stores/authStore';
import { isValidEmail } from '../../lib/validation';
import Field from './Field';
import PasswordField from './PasswordField';
import SubmitButton from './SubmitButton';

// Shared login form; the persona `theme` drives accent color, copy and links.
export default function LoginForm({ theme }) {
  const t = theme;
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState(false);

  useEffect(() => () => clearError(), [clearError]);

  const emailError =
    touched && !isValidEmail(form.email) ? 'Informe um e-mail válido' : '';
  const pwdError = touched && !form.password ? 'Informe sua senha' : '';

  const change = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValidEmail(form.email) || !form.password) return;
    try {
      const user = await login(form);
      navigate(homePathFor(user.type));
    } catch {
      /* erro exibido via store */
    }
  };

  return (
    <>
      <div className="mb-8">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: t.accentSoft, color: t.accent }}
        >
          {t.label}
        </span>
        <h2 className="mt-4 font-grotesk text-3xl font-bold tracking-tight text-ink">
          Entrar na sua conta
        </h2>
        <p className="mt-2 text-sm text-ink/55">{t.loginSubtitle}</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <svg width="16" height="16" viewBox="0 0 24 24" className="mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="E-mail"
          type="email"
          name="email"
          value={form.email}
          onChange={change}
          placeholder={t.emailPlaceholder}
          error={emailError}
          accent={t.accent}
          autoComplete="email"
        />
        <div>
          <PasswordField
            label="Senha"
            name="password"
            value={form.password}
            onChange={change}
            placeholder="••••••••"
            error={pwdError}
            meter={false}
            accent={t.accent}
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link
              to="#"
              className="text-xs font-medium no-underline hover:underline"
              style={{ color: t.accent }}
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <SubmitButton loading={isLoading} accent={t.accent} glow={t.glow}>
          {isLoading ? 'Entrando…' : 'Entrar'}
        </SubmitButton>
      </form>

      <div className="mt-6 border-t border-black/5 pt-6 text-center text-sm text-ink/55">
        Não tem conta?{' '}
        <Link
          to={t.registerPath}
          className="font-semibold no-underline hover:underline"
          style={{ color: t.accent }}
        >
          {t.registerCta}
        </Link>
      </div>

      <p className="mt-3 text-center text-xs text-ink/40">
        {t.key === 'empresa' ? 'É motorista?' : 'É empresa?'}{' '}
        <Link to={t.otherLoginPath} className="no-underline hover:underline">
          {t.otherLoginCta}
        </Link>
      </p>
    </>
  );
}
