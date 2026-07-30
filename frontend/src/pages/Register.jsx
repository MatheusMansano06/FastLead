import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Alert, Card } from '../components';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    phone: '',
    cnpj: '',
  });
  const [validationError, setValidationError] = useState('');

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
    setValidationError('');
  };

  const validateForm = () => {
    if (formData.password.length < 8) {
      setValidationError('Senha deve ter no mínimo 8 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError('As senhas não coincidem');
      return false;
    }
    if (!formData.email || !formData.fullName || !formData.companyName) {
      setValidationError('Preencha todos os campos obrigatórios');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        companyName: formData.companyName,
        phone: formData.phone,
        cnpj: formData.cnpj,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Register error:', err);
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
            Crie sua conta de anunciante
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

        {validationError && (
          <Alert
            type="error"
            message={validationError}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome Completo"
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Seu Nome"
            required
            disabled={isLoading}
          />

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
            label="Empresa"
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Nome da Empresa"
            required
            disabled={isLoading}
          />

          <Input
            label="CNPJ (opcional)"
            type="text"
            name="cnpj"
            value={formData.cnpj}
            onChange={handleChange}
            placeholder="00.000.000/0000-00"
            disabled={isLoading}
          />

          <Input
            label="Telefone (opcional)"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="(11) 98765-4321"
            disabled={isLoading}
          />

          <Input
            label="Senha"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            helperText="Mínimo 8 caracteres"
            required
            disabled={isLoading}
          />

          <Input
            label="Confirmar Senha"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
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
            Cadastrar
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-center text-body-sm text-neutral-600 dark:text-neutral-400">
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Faça login
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
