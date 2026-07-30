import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Navbar, Sidebar, Card, Button, Alert } from '../components';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-heading-xl font-display mb-2">
              Perfil
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Gerenciar informações da sua conta
            </p>
          </div>

          {/* Informações Pessoais */}
          <Card padding="lg" className="mb-6">
            <h2 className="text-heading-md font-display mb-6">
              Informações Pessoais
            </h2>

            <Alert
              type="info"
              message="Sua conta está verificada e ativa como anunciante na plataforma FastLead."
              className="mb-6"
            />

            <div className="space-y-4">
              <div>
                <label className="text-body-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Email
                </label>
                <p className="text-body-md font-medium text-neutral-900 dark:text-neutral-50 mt-1">
                  {user.email}
                </p>
              </div>

              <div>
                <label className="text-body-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Tipo de Usuário
                </label>
                <p className="text-body-md font-medium text-neutral-900 dark:text-neutral-50 mt-1 capitalize">
                  Anunciante
                </p>
              </div>

              <div>
                <label className="text-body-sm font-medium text-neutral-600 dark:text-neutral-400">
                  ID da Conta
                </label>
                <p className="text-body-md font-mono text-neutral-900 dark:text-neutral-50 mt-1 break-all">
                  {user.id}
                </p>
              </div>
            </div>
          </Card>

          {/* Configurações de Segurança */}
          <Card padding="lg" className="mb-6">
            <h2 className="text-heading-md font-display mb-6">
              Segurança
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                    Autenticação de Dois Fatores
                  </h3>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Adicione uma camada extra de segurança à sua conta
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Em Breve
                </Button>
              </div>

              <hr className="border-neutral-200 dark:border-neutral-800 my-4" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                    Alterar Senha
                  </h3>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Atualize sua senha regularmente
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Em Breve
                </Button>
              </div>
            </div>
          </Card>

          {/* Preferências */}
          <Card padding="lg" className="mb-6">
            <h2 className="text-heading-md font-display mb-6">
              Preferências
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                    Notificações por Email
                  </h3>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Receba atualizações sobre suas campanhas
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded cursor-pointer"
                />
              </div>

              <hr className="border-neutral-200 dark:border-neutral-800 my-4" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                    Newsletter Semanal
                  </h3>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Dicas e insights sobre publicidade em veículos de aplicativo
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* API Keys */}
          <Card padding="lg" className="mb-6">
            <h2 className="text-heading-md font-display mb-6">
              Integração API
            </h2>

            <Alert
              type="info"
              message="As chaves de API permitem que sistemas externos se conectem à sua conta FastLead."
              className="mb-6"
            />

            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 mb-4">
              <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-2">
                Chave API
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value="••••••••••••••••••••••••••"
                  readOnly
                  className="flex-grow px-3 py-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-50"
                />
                <Button variant="outline" size="md">
                  Copiar
                </Button>
              </div>
            </div>

            <Button variant="outline" disabled>
              Regenerar Chave
            </Button>
          </Card>

          {/* Zona de Perigo */}
          <Card padding="lg" className="border-error/50 dark:border-error/30">
            <h2 className="text-heading-md font-display mb-6 text-error">
              Zona de Perigo
            </h2>

            <Alert
              type="error"
              message="As ações nesta seção são irreversíveis. Proceda com cuidado."
              className="mb-6"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                    Excluir Conta
                  </h3>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Remova permanentemente sua conta e todos os dados
                  </p>
                </div>
                <Button variant="danger" disabled>
                  Excluir
                </Button>
              </div>
            </div>
          </Card>

          {/* Suporte */}
          <Card padding="lg" className="mt-8 bg-primary-50 dark:bg-primary-950/30">
            <div className="text-center">
              <h3 className="text-heading-md font-display mb-2">
                Precisa de Ajuda?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Contate nosso time de suporte para dúvidas ou problemas
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => window.open('mailto:suporte@fastlead.com')}
                >
                  Enviar Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://fastlead.com/docs')}
                >
                  Documentação
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Profile;
