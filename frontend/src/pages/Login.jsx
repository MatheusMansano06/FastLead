import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Alert, Card } from '../components';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <Card padding="lg" className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl">⚡</span>
            <h1 className="text-heading-lg font-display text-primary-900 dark:text-primary-100">
              FastLead
            </h1>
          </div>
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Acesse sua conta de anunciante
          </p>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            onClose={clearError}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            required
            disabled={isLoading}
          />

          <Input
            label="Senha"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
            className="mt-6"
          >
            Entrar
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-center text-body-sm text-neutral-600 dark:text-neutral-400">
            Não tem uma conta?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
