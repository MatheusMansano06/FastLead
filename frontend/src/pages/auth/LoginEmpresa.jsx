import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell, { AUTH_THEMES } from '../../components/auth/AuthShell';
import LoginForm from '../../components/auth/LoginForm';
import { useAuthStore, homePathFor } from '../../stores/authStore';

const theme = {
  ...AUTH_THEMES.empresa,
  loginSubtitle: 'Acesse o painel de campanhas, leads e relatórios da sua marca.',
  emailPlaceholder: 'voce@suaempresa.com.br',
  registerPath: '/cadastro/empresa',
  registerCta: 'Cadastrar minha empresa',
  otherLoginPath: '/entrar/motorista',
  otherLoginCta: 'Entrar como motorista',
};

export default function LoginEmpresa() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) navigate(homePathFor(user.type), { replace: true });
  }, [isAuthenticated, user, navigate]);

  return (
    <AuthShell theme={theme}>
      <LoginForm theme={theme} />
    </AuthShell>
  );
}
