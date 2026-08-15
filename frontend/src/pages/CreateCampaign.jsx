import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCampaignStore } from '../stores/campaignStore';
import { apiClient } from '../services/api';
import { Navbar, Sidebar, Button, Input, Card, Alert } from '../components';

/**
 * Criação de campanha.
 *
 * O anunciante compra tempo de tela: escolhe quantos carros, quanto tempo por
 * dia em cada um e em que período do calendário. O preço vem do servidor a cada
 * mudança — nenhuma conta é feita aqui, porque uma fórmula duplicada no
 * navegador acabaria divergindo do que é cobrado.
 */

/** Teto do motorista. Nenhuma campanha sozinha pode passar disso. */
const TETO_MINUTOS_DIA = 12 * 60;

/** Degraus de tempo diário, os mesmos do simulador da landing. */
const DEGRAUS_HORAS = [0.5, 1, 2, 3, 4, 6, 8, 12];

const hoje = () => new Date().toISOString().slice(0, 10);
const emDias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const moeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const rotuloHoras = (min) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
};

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { createCampaign, isLoading, error } = useCampaignStore();

  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: null,
    numVehicles: 10,
    dailyMinutes: 120,
    startDate: hoje(),
    endDate: emDias(30),
    pricePerLead: 50,
  });
  const [validationError, setValidationError] = useState('');

  /** Cotação vinda do servidor. Nulo enquanto não houve resposta. */
  const [cotacao, setCotacao] = useState(null);
  const [cotando, setCotando] = useState(false);
  const pedidoAtual = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const dias = useMemo(() => {
    const a = new Date(formData.startDate);
    const b = new Date(formData.endDate);
    if (isNaN(a) || isNaN(b) || b < a) return 0;
    return Math.round((b - a) / 86400000) + 1;
  }, [formData.startDate, formData.endDate]);

  // ---- Cotação ao vivo ----
  // Espera o usuário parar de mexer antes de perguntar o preço: arrastar um
  // controle dispara dezenas de mudanças, e uma requisição por quadro só
  // atrasaria a resposta que importa, a última.
  useEffect(() => {
    if (dias < 1 || formData.numVehicles < 1) {
      setCotacao(null);
      return;
    }
    const id = ++pedidoAtual.current;
    setCotando(true);
    const t = setTimeout(async () => {
      try {
        const q = await apiClient.simulateCampaign({
          numVehicles: formData.numVehicles,
          dailyMinutes: formData.dailyMinutes,
          startDate: formData.startDate,
          endDate: formData.endDate,
        });
        // Descarta resposta atrasada: sem isto, uma cotação antiga que demorou
        // mais poderia chegar depois da nova e mostrar o preço errado.
        if (id === pedidoAtual.current) {
          setCotacao(q);
          setCotando(false);
        }
      } catch {
        if (id === pedidoAtual.current) {
          setCotacao(null);
          setCotando(false);
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [
    formData.numVehicles,
    formData.dailyMinutes,
    formData.startDate,
    formData.endDate,
    dias,
  ]);

  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    setValidationError('');
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      // Data-URL direto no estado: é o formato que a coluna image_url guarda,
      // e evita um endpoint de upload só para isso.
      setPreview(event.target?.result);
      setFormData((prev) => ({ ...prev, imageUrl: event.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setValidationError('Nome da campanha é obrigatório');
      return false;
    }
    if (!formData.description.trim()) {
      setValidationError('Descrição é obrigatória');
      return false;
    }
    if (formData.numVehicles < 1) {
      setValidationError('A campanha precisa de pelo menos 1 veículo');
      return false;
    }
    if (dias < 1) {
      setValidationError('A data final precisa ser igual ou posterior à inicial');
      return false;
    }
    if (formData.dailyMinutes > TETO_MINUTOS_DIA) {
      setValidationError(
        `O máximo é ${rotuloHoras(TETO_MINUTOS_DIA)} por dia — o total que um motorista consegue exibir.`,
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await createCampaign({
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        numVehicles: formData.numVehicles,
        dailyMinutes: formData.dailyMinutes,
        pricePerLead: formData.pricePerLead,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });
      navigate('/campaigns');
    } catch (err) {
      console.error('Create campaign error:', err);
    }
  };

  /** Quantas campanhas deste tamanho cabem no dia de um motorista. */
  const cabemPorMotorista = Math.floor(TETO_MINUTOS_DIA / (formData.dailyMinutes || 1));

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-heading-lg font-display mb-2">Nova campanha</h1>
            <p className="text-body-md text-neutral-600 dark:text-neutral-400 mb-8">
              Você compra tempo de tela nos tablets. O preço acompanha quantos
              carros, quanto tempo por dia e por quantos dias.
            </p>

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}
            {validationError && (
              <Alert variant="warning" className="mb-6">
                {validationError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ---------- Anúncio ---------- */}
              <Card padding="lg">
                <h2 className="text-heading-md font-display mb-6">O anúncio</h2>

                <div className="space-y-4">
                  <Input
                    label="Nome da campanha"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Ex.: Clínica Sorrisos — 20% off"
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
                      rows={3}
                      disabled={isLoading}
                      className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 text-body-md"
                      placeholder="O que o passageiro vai ler na tela"
                    />
                  </div>

                  <div>
                    <label className="block text-body-md font-medium mb-2 text-neutral-900 dark:text-neutral-50">
                      Imagem do anúncio
                    </label>
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageChange}
                      disabled={isLoading}
                      className="hidden"
                    />
                    <label
                      htmlFor="imageInput"
                      className="cursor-pointer block border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 text-center"
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt="Prévia do anúncio"
                          className="max-h-48 mx-auto rounded"
                        />
                      ) : (
                        <div>
                          <p className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                            Selecione uma imagem
                          </p>
                          <p className="text-body-sm text-neutral-600 dark:text-neutral-400">
                            PNG, JPG ou WebP — proporção de tela deitada
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </Card>

              {/* ---------- Inventário ---------- */}
              <Card padding="lg">
                <h2 className="text-heading-md font-display mb-2">
                  Quanto de tela você quer
                </h2>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  O tablet de cada motorista tem {rotuloHoras(TETO_MINUTOS_DIA)}{' '}
                  de exibição por dia, divididos entre os anunciantes daquele
                  carro em aparições de 20 segundos.
                </p>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <label className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                        Tempo por dia em cada carro
                      </label>
                      <span className="text-heading-sm font-display text-primary-700 dark:text-primary-300">
                        {rotuloHoras(formData.dailyMinutes)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DEGRAUS_HORAS.map((h) => {
                        const min = Math.round(h * 60);
                        const ativo = formData.dailyMinutes === min;
                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={isLoading}
                            onClick={() =>
                              setFormData((p) => ({ ...p, dailyMinutes: min }))
                            }
                            className={`px-4 py-2 rounded-lg text-body-md font-medium border transition ${
                              ativo
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700'
                            }`}
                          >
                            {rotuloHoras(min)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-2">
                      Cabem {cabemPorMotorista} campanha
                      {cabemPorMotorista === 1 ? '' : 's'} deste tamanho no dia
                      de um motorista.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Veículos"
                      type="number"
                      name="numVehicles"
                      value={formData.numVehicles}
                      onChange={handleChange}
                      min="1"
                      max="10000"
                      disabled={isLoading}
                    />
                    <Input
                      label="Início"
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      min={hoje()}
                      disabled={isLoading}
                    />
                    <Input
                      label="Fim"
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      min={formData.startDate}
                      disabled={isLoading}
                    />
                  </div>

                  <Input
                    label="Preço por lead convertido (R$)"
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

              {/* ---------- Preço ---------- */}
              <Card padding="lg">
                <h2 className="text-heading-md font-display mb-6">
                  Investimento
                </h2>

                {dias < 1 ? (
                  <p className="text-body-md text-warning">
                    Escolha um período válido para ver o preço.
                  </p>
                ) : cotacao ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 bg-primary-50 dark:bg-primary-950 rounded-lg p-4">
                      <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                        Total da campanha
                      </p>
                      <p
                        className={`text-heading-lg font-display text-primary-900 dark:text-primary-100 ${cotando ? 'opacity-50' : ''}`}
                      >
                        {moeda(cotacao.total)}
                      </p>
                      {cotacao.savings > 0 && (
                        <p className="text-body-sm text-success mt-1">
                          {moeda(cotacao.savings)} de desconto
                        </p>
                      )}
                    </div>

                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                      <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                        Por dia
                      </p>
                      <p className="text-heading-sm font-display">
                        {moeda(cotacao.perDay)}
                      </p>
                      <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {cotacao.days} dias • {cotacao.vehicles} veículos
                      </p>
                    </div>

                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                      <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-1">
                        Por veículo/mês
                      </p>
                      <p className="text-heading-sm font-display">
                        {moeda(cotacao.perVehicleMonth)}
                      </p>
                      <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {rotuloHoras(cotacao.dailyMinutes)} de tela por dia
                      </p>
                    </div>

                    {cotacao.discounts.combined > 0 && (
                      <div className="md:col-span-3 text-body-sm text-neutral-600 dark:text-neutral-400">
                        Descontos aplicados:{' '}
                        {cotacao.discounts.volume > 0 &&
                          `${Math.round(cotacao.discounts.volume * 100)}% por volume`}
                        {cotacao.discounts.volume > 0 &&
                          cotacao.discounts.term > 0 &&
                          ' + '}
                        {cotacao.discounts.term > 0 &&
                          `${Math.round(cotacao.discounts.term * 100)}% por prazo`}
                        . Contratos mais longos e mais veículos reduzem o preço.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-body-md text-neutral-600 dark:text-neutral-400">
                    {cotando ? 'Calculando…' : 'Preço indisponível no momento.'}
                  </p>
                )}
              </Card>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading || !cotacao}>
                  {isLoading ? 'Criando…' : 'Criar campanha'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/campaigns')}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateCampaign;
