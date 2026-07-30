import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell, { AUTH_THEMES } from '../../components/auth/AuthShell';
import LoginForm from '../../components/auth/LoginForm';
import { useAuthStore, homePathFor } from '../../stores/authStore';

const theme = {
  ...AUTH_THEMES.motorista,
  loginSubtitle: 'Veja seus ganhos por lead, repasses e o status do seu tablet.',
  emailPlaceholder: 'voce@email.com',
  registerPath: '/cadastro/motorista',
  registerCta: 'Quero ser parceiro',
  otherLoginPath: '/entrar/empresa',
  otherLoginCta: 'Entrar como empresa',
};

export default function LoginMotorista() {
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
