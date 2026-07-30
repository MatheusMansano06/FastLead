import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCampaignStore } from '../stores/campaignStore';
import { Navbar, Sidebar, Button, Input, Card, Alert } from '../components';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { createCampaign, isLoading, error } = useCampaignStore();
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null,
    taxiCount: 10,
    durationDays: 7,
    pricePerLead: 50,
    budget: 500,
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
    setValidationError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setValidationError('Nome da campanha é obrigatório');
      return false;
    }
    if (!formData.description.trim()) {
      setValidationError('Descrição é obrigatória');
      return false;
    }
    if (!formData.image) {
      setValidationError('Imagem é obrigatória');
      return false;
    }
    if (formData.taxiCount < 1) {
      setValidationError('Quantidade de veículos deve ser no mínimo 1');
      return false;
    }
    if (formData.durationDays < 1) {
      setValidationError('Duração deve ser no mínimo 1 dia');
      return false;
    }
    if (formData.budget <= 0) {
      setValidationError('Orçamento deve ser maior que 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + formData.durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      await createCampaign({
        ...formData,
        startDate,
        endDate,
      });
      navigate('/campaigns');
    } catch (err) {
      console.error('Create campaign error:', err);
    }
  };

  const estimatedLeads = Math.floor(formData.budget / formData.pricePerLead);
  const estimatedROI = estimatedLeads > 0 ? ((estimatedLeads * 100) - formData.budget) / formData.budget * 100 : 0;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-heading-xl font-display mb-2">
              Criar Nova Campanha
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Configure sua campanha publicitária em veículos de aplicativo
            </p>
          </div>

          {error && (
            <Alert
              type="error"
              message={error}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção 1: Informações Básicas */}
            <Card padding="lg">
              <h2 className="text-heading-md font-display mb-6">
                Informações Básicas
              </h2>

              <div className="space-y-4">
                <Input
                  label="Nome da Campanha"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Promoção de Verão 2024"
                  required
                  disabled={isLoading}
                />

                <div>
                  <label className="block text-body-md font-medium mb-2 text-neutral-900 dark:text-neutral-50">
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descreva sua campanha..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-body-md font-medium mb-2 text-neutral-900 dark:text-neutral-50">
                    Imagem do Anúncio
                  </label>
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isLoading}
                      className="hidden"
                      id="imageInput"
                      required
                    />
                    <label htmlFor="imageInput" className="cursor-pointer block">
                      {preview ? (
                        <div className="space-y-2">
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg mx-auto"
                          />
                          <p className="text-body-sm text-neutral-600 dark:text-neutral-400">
                            Clique para alterar
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-2xl">🖼️</p>
                          <p className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                            Selecione uma imagem
                          </p>
                          <p className="text-body-sm text-neutral-600 dark:text-neutral-400">
                            PNG, JPG ou WebP
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* Seção 2: Configuração */}
            <Card padding="lg">
              <h2 className="text-heading-md font-display mb-6">
                Configuração da Campanha
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Quantidade de Veículos"
                  type="number"
                  name="taxiCount"
                  value={formData.taxiCount}
                  onChange={handleChange}
                  min="1"
                  max="5000"
                  disabled={isLoading}
                />

                <Input
                  label="Duração (dias)"
                  type="number"
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={handleChange}
                  min="1"
                  max="90"
                  disabled={isLoading}
                />

                <Input
                  label="Orçamento Total (R$)"
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  min="0"
                  step="10"
                  disabled={isLoading}
                />

                <Input
                  label="Preço por Lead (R$)"
                  type="number"
                  name="pricePerLead"
                  value={formData.pricePerLead}
                  onChange={handleChange}
                  min="1"
                  step="5"
                  disabled={isLoading}
                />
              </div>
            </Card>

            {/* Seção 3: Preview & Estimativa */}
            <Card padding="lg">
              <h2 className="text-heading-md font-display mb-6">
                Preview & Estimativa
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preview do Anúncio */}
                <div>
                  <h3 className="text-body-md font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
                    Visualização do Anúncio
                  </h3>
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 aspect-video flex items-center justify-center">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Campaign preview"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <p className="text-neutral-500 dark:text-neutral-400">
                        Imagem não carregada
                      </p>
                    )}
                  </div>
                </div>

                {/* Estimativas */}
                <div className="space-y-4">
                  <div className="bg-primary-50 dark:bg-primary-950 rounded-lg p-4">
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      Leads Estimados
                    </p>
                    <p className="text-heading-lg font-display text-primary-900 dark:text-primary-100">
                      {estimatedLeads}
                    </p>
                  </div>

                  <div className="bg-secondary-50 dark:bg-secondary-950 rounded-lg p-4">
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      ROI Estimado
                    </p>
                    <p className={`text-heading-lg font-display ${estimatedROI > 0 ? 'text-success' : 'text-error'}`}>
                      {estimatedROI > 0 ? '+' : ''}{estimatedROI.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                      Período
                    </p>
                    <p className="text-body-md font-semibold text-neutral-900 dark:text-neutral-50">
                      {formData.durationDays} dias • {formData.taxiCount} veículos
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Botões de Ação */}
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                fullWidth
              >
                Criar Campanha
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate('/campaigns')}
                disabled={isLoading}
                fullWidth
              >
                Cancelar
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateCampaign;
