import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse, LoginPayload, RegisterPayload, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type TabletAcquisition = 'OWN_DEVICE' | 'FASTLEAD_LOAN';
export type TabletRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DELIVERED'
  | 'EXPIRED';

/**
 * Solicitação de tablet como ela volta da API. As fotos de documento só vêm no
 * detalhe do admin — nunca em listagem nem para o próprio motorista.
 */
export interface TabletRequest {
  id: string;
  acquisition: TabletAcquisition;
  status: TabletRequestStatus;
  attempt: number;
  rejection_reason: string | null;
  reviewed_at: string | null;
  withdrawal_code: string | null;
  withdrawal_expires_at: string | null;
  contract_accepted_at: string | null;
  contract_signature: string | null;
  contract_version: string | null;
  delivered_at: string | null;
  device_identifier: string | null;
  created_at: string;
}

export interface TabletRequestDriver {
  id: string;
  cpf: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  license_plate: string | null;
  vehicle_info?: string | null;
  status?: string;
  created_at?: string;
  user: { name: string; email: string; avatar_url?: string | null };
}

class ApiClient {
  private client: AxiosInstance;
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            try {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });
              const { token, refreshToken: newRefreshToken } = response.data.data;
              this.setToken(token);
              this.setRefreshToken(newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              this.logout();
              throw refreshError;
            }
          } else {
            this.logout();
          }
        }

        // A API explica o problema em português ("Você precisa parear o
        // tablet..."), mas o axios sobrescreve isso com "Request failed with
        // status code 400". Só 8 dos 47 métodos daqui tratavam o erro, então a
        // maioria das telas mostrava o texto do axios e o usuário não ficava
        // sabendo o que fazer. Traz a mensagem do servidor para `message`, que
        // é o que as telas leem.
        const dados = error.response?.data as
          { message?: string; error?: string; code?: string } | undefined;
        const doServidor = dados?.message || dados?.error;
        if (doServidor) error.message = doServidor;

        // Motivo estável da recusa, para a tela reagir com a UI certa em vez de
        // procurar trecho de frase. Vai em `apiCode` porque `error.code` é do
        // axios (ERR_NETWORK, ECONNABORTED) e sobrescrever quebraria quem lê.
        if (dados?.code) (error as AxiosError & { apiCode?: string }).apiCode = dados.code;

        return Promise.reject(error);
      }
    );
  }

  // ===== Token Management =====
  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token);
  }

  // ===== Auth Endpoints =====
  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/login', payload);
      const { token, refreshToken } = response.data.data;
      this.setToken(token);
      this.setRefreshToken(refreshToken);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/register', {
        ...payload,
        type: payload.type ?? 'advertiser',
      });
      const { token, refreshToken } = response.data.data;
      this.setToken(token);
      this.setRefreshToken(refreshToken);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await this.client.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Consulta CNPJ na Receita (via backend/BrasilAPI) para comprovar a empresa.
  async verifyCNPJ(cnpj: string) {
    const response = await this.client.get(`/auth/verify-cnpj/${cnpj}`);
    return response.data.data as {
      valid: boolean;
      found?: boolean | null;
      active?: boolean;
      razaoSocial?: string | null;
      situacao?: string | null;
      uf?: string | null;
      municipio?: string | null;
      reason?: string;
    };
  }

  // ===== Advertiser Endpoints =====
  async getProfile() {
    try {
      const response = await this.client.get('/advertiser/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCampaigns(page = 1, limit = 10) {
    try {
      const response = await this.client.get('/advertiser/campaigns', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Quanto custaria, sem criar nada.
   *
   * O preço vem do servidor de propósito, e não de uma conta feita aqui: a
   * mesma função que simula é a que cobra. Fórmula duplicada no navegador
   * acabaria divergindo da fatura, e a empresa descobriria depois de assinar.
   */
  async simulateCampaign(data: {
    numVehicles: number;
    dailyMinutes: number;
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    targetCities?: string[];
  }) {
    try {
      const response = await this.client.post('/advertiser/campaigns/simulate', data);
      return response.data?.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Cria a campanha.
   *
   * JSON, e com os nomes que a rota espera. A versão anterior montava um
   * multipart com `name`, `budget` e `taxiCount` — o backend lê `title`,
   * `numVehicles` e `dailyMinutes` de `req.body`, e não tem middleware de
   * multipart, então `req.body` chegava indefinido e a criação estourava 500.
   * A tela existia inteira e nunca criou uma campanha.
   *
   * A imagem vai como data-URL dentro do JSON, que é o formato que a coluna
   * `image_url` guarda.
   */
  async createCampaign(data: {
    title: string;
    description?: string;
    imageUrl?: string | null;
    numVehicles: number;
    dailyMinutes: number;
    pricePerLead: number;
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    targetCities?: string[];
  }) {
    try {
      const response = await this.client.post('/advertiser/campaigns', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCampaign(id: string, data: any) {
    try {
      const response = await this.client.patch(`/advertiser/campaigns/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCampaign(id: string) {
    try {
      const response = await this.client.delete(`/advertiser/campaigns/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCampaignAnalytics(campaignId?: string, startDate?: string, endDate?: string) {
    try {
      const response = await this.client.get('/advertiser/analytics', {
        params: { campaignId, startDate, endDate },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Leads da empresa, de todas as campanhas. A paginação é por offset — antes
  // mandava `page`, que a API não lê.
  async getLeads(limit = 50, offset = 0, status?: string) {
    const r = await this.client.get('/advertiser/leads', {
      params: { limit, offset, ...(status ? { status } : {}) },
    });
    return r.data.data as {
      leads: {
        id: string;
        status: 'PENDING' | 'CONVERTED' | 'INVALID';
        scanTime: string;
        contactName: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        conversionValue: number | null;
        convertedAt: string | null;
        campaignId: string | null;
        campaignTitle: string | null;
        motoristaName: string | null;
      }[];
      total: number;
    };
  }

  /**
   * Marca o lead como venda fechada. É o que dispara o dinheiro: debita a
   * comissão da empresa e credita o motorista, na mesma transação.
   */
  async convertLead(leadId: string, conversionValue: number) {
    const r = await this.client.patch(`/advertiser/leads/${leadId}/convert`, {
      conversion_value: conversionValue,
    });
    return r.data as {
      lead_id: string;
      conversion_value: number;
      saldo_empresa: number;
      motorista: { pendente: number; pago: number; total: number };
    };
  }

  // ===== Marketplace: Motorista =====
  async getOpportunities() {
    const r = await this.client.get('/driver/opportunities');
    return r.data.data as any[];
  }

  async acceptOpportunity(campaignId: string) {
    const r = await this.client.post(`/driver/opportunities/${campaignId}/accept`);
    return r.data.data;
  }

  async getDriverCampaigns() {
    const r = await this.client.get('/driver/campaigns');
    return r.data.data as any[];
  }

  // Motorista tira o anúncio do tablet dele (vale até para os que o MASTER pôs).
  async removeDriverCampaign(campaignId: string) {
    const r = await this.client.delete(`/driver/campaigns/${campaignId}`);
    return r.data.data;
  }

  async getCampaignReviews(campaignId: string) {
    const r = await this.client.get(`/driver/campaigns/${campaignId}/reviews`);
    return r.data.data as {
      reviews: Array<{
        id: string;
        rating: string;
        comment?: string;
        motoristaName: string;
        motoristaId: string;
        createdAt: string;
      }>;
      stats: { avgRating: number; totalReviews: number; distribution: Record<string, number> };
      myReview: { rating: string; comment?: string } | null;
    };
  }

  async submitCampaignReview(campaignId: string, rating: string, comment?: string) {
    const r = await this.client.post(`/driver/campaigns/${campaignId}/reviews`, {
      rating,
      comment,
    });
    return r.data.data;
  }

  // ===== Marketplace: Anunciante =====
  async getMotoristas(city?: string) {
    const r = await this.client.get('/advertiser/motoristas', { params: city ? { city } : {} });
    return r.data.data as any[];
  }

  async getAdvertiserCampaigns() {
    const r = await this.client.get('/advertiser/campaigns');
    return r.data.data as any[];
  }

  async getCampaignDetails(id: string) {
    const r = await this.client.get(`/advertiser/campaigns/${id}`);
    return r.data.data;
  }

  // Cria e publica um anúncio (JSON — chega aos motoristas como oportunidade).
  async createAd(payload: {
    title: string;
    description?: string;
    imageUrl?: string;
    numVehicles: number;
    durationDays: number;
    pricePerLead: number;
    publish?: boolean;
    destinationUrl?: string;
    ctaText?: string;
    // Montagem do anúncio no tablet
    showQr?: boolean;
    qrPosition?: string;
    showText?: boolean;
    // Segmentação — array vazio significa "qualquer motorista"
    targetRegions?: string[];
    targetStates?: string[];
    targetCities?: string[];
    targetRideApps?: string[];
    targetCategories?: string[];
  }) {
    const r = await this.client.post('/advertiser/campaigns', payload);
    return r.data.data;
  }

  // ===== Catálogo de segmentação (regiões, UFs, apps, modalidades) =====
  // Vem do backend para os filtros nunca divergirem dos enums do banco.
  async getSegmentationCatalog() {
    const r = await this.client.get('/meta/segmentation');
    return r.data.data as {
      regions: { value: string; label: string; ufs: string[] }[];
      states: { value: string; label: string; region: string }[];
      rideApps: { value: string; label: string }[];
      rideCategories: { value: string; label: string; app: string }[];
    };
  }

  // ===== Perfil do motorista =====
  async getDriverProfile() {
    const r = await this.client.get('/driver/me');
    return r.data.data;
  }

  async updateDriverProfile(payload: {
    name?: string;
    phone?: string;
    bio?: string;
    city?: string;
    state?: string;
    vehicleInfo?: string;
    licensePlate?: string;
    rideApps?: string[];
    rideCategories?: string[];
    avatarUrl?: string;
    status?: string;
  }) {
    const r = await this.client.patch('/driver/profile', payload);
    return r.data.data;
  }

  // ===== Tablet: pareamento pelo app do motorista =====
  async createPairingCode(label?: string) {
    const r = await this.client.post('/driver/devices/pair-code', { label });
    return r.data.data as {
      deviceId: string;
      code: string;
      expiresAt: string;
      expiresInMinutes: number;
      // QR que o motorista lê com o próprio tablet para abrir a tela de
      // pareamento — o código continua sendo digitado à mão.
      tabletUrl: string;
      tabletUrlQrCode: string;
    };
  }

  // Histórico de jornadas encerradas (o "dia X finalizado" do motorista).
  async getDriverSessions(limit = 30) {
    const r = await this.client.get('/driver/sessions', { params: { limit } });
    return r.data.data as {
      id: string;
      date: string;
      ordemNoDia: number;
      totalNoDia: number;
      startedAt: string;
      endedAt: string;
      durationMinutes: number;
      impressions: number;
      scans: number;
      uniqueScans: number;
      leads: number;
      campaigns: string[];
    }[];
  }

  async getDriverDevices() {
    const r = await this.client.get('/driver/devices');
    return r.data.data as any[];
  }

  async unpairDevice(deviceId: string) {
    const r = await this.client.delete(`/driver/devices/${deviceId}`);
    return r.data.data;
  }

  /**
   * GET cru, devolvendo a resposta do axios inteira.
   *
   * As telas de detalhe do admin já chamavam `apiClient.get(...)` — um método
   * que nunca existiu, então elas quebravam ao abrir. Em vez de reescrever
   * cada chamada, o método passa a existir com o formato que elas esperam
   * (`res.data.data`).
   */
  async get(url: string, config?: Record<string, unknown>) {
    return this.client.get(url, config);
  }

  // ===== Verificação de identidade e comodato do tablet =====
  async getMyTabletRequest() {
    const r = await this.client.get('/driver/tablet-request');
    return r.data.data as {
      request: TabletRequest | null;
      /** Aprovado ou entregue: é o que destrava o pareamento. */
      verified: boolean;
      contractVersion: string;
    };
  }

  async createTabletRequest(payload: {
    acquisition: 'OWN_DEVICE' | 'FASTLEAD_LOAN';
    selfiePhoto: string;
    docFrontPhoto: string;
    docBackPhoto: string;
    /** Recorte quadrado da selfie — vira a foto de perfil do motorista. */
    avatarPhoto?: string;
    /** Nome digitado no aceite — só no comodato. */
    contractSignature?: string;
  }) {
    const r = await this.client.post('/driver/tablet-request', payload);
    return r.data.data as TabletRequest;
  }

  // ===== MASTER (admin) =====
  async masterTabletRequests(status?: string, page = 1, limit = 50) {
    const r = await this.client.get('/admin/tablet-requests', {
      params: { ...(status ? { status } : {}), page, limit },
    });
    return r.data.data as {
      items: (TabletRequest & { motorista: TabletRequestDriver })[];
      total: number;
      page: number;
      limit: number;
      countsByStatus: Record<string, number>;
    };
  }

  /** Único endpoint que traz as fotos do documento — carregue só ao abrir o detalhe. */
  async masterTabletRequestDetail(id: string) {
    const r = await this.client.get(`/admin/tablet-requests/${id}`);
    return r.data.data as TabletRequest & {
      selfiePhoto?: string;
      selfie_photo: string;
      doc_front_photo: string;
      doc_back_photo: string;
      contract_ip: string | null;
      reviewed_by: { name: string } | null;
      motorista: TabletRequestDriver;
    };
  }

  async approveTabletRequest(id: string) {
    const r = await this.client.post(`/admin/tablet-requests/${id}/approve`);
    return r.data.data as TabletRequest;
  }

  async rejectTabletRequest(id: string, reason: string) {
    const r = await this.client.post(`/admin/tablet-requests/${id}/reject`, { reason });
    return r.data.data as TabletRequest;
  }

  async deliverTabletRequest(
    id: string,
    payload: { code: string; deviceIdentifier: string; deviceId?: string }
  ) {
    const r = await this.client.post(`/admin/tablet-requests/${id}/deliver`, payload);
    return r.data.data as TabletRequest;
  }

  async masterOverview(filters: Record<string, string> = {}) {
    const r = await this.client.get('/admin/overview', { params: filters });
    return r.data.data;
  }

  async masterTimeseries(days = 14, filters: Record<string, string> = {}) {
    const r = await this.client.get('/admin/timeseries', { params: { days, ...filters } });
    return r.data.data as {
      date: string;
      impressions: number;
      scans: number;
      uniqueScans: number;
      leads: number;
    }[];
  }

  async masterDrivers(filters: Record<string, string> = {}, page = 1, limit = 50) {
    const r = await this.client.get('/admin/drivers', { params: { ...filters, page, limit } });
    return r.data.data;
  }

  async masterCompanies(page = 1, limit = 50) {
    const r = await this.client.get('/admin/companies', { params: { page, limit } });
    return r.data.data;
  }

  async masterCampaigns(page = 1, limit = 50) {
    const r = await this.client.get('/admin/campaigns', { params: { page, limit } });
    return r.data.data;
  }

  // Distribui a campanha automaticamente para motoristas com tablet pareado
  // que batem com a segmentação.
  async masterDistribute(campaignId: string) {
    const r = await this.client.post(`/admin/campaigns/${campaignId}/distribute`);
    return r.data.data as {
      assigned: number;
      candidates?: number;
      vagasRestantes?: number;
      reason?: string;
    };
  }

  // Repasses pendentes agrupados por motorista — é um PIX por pessoa, não por
  // lead. Traz a conta bancária junto porque é dela que sai o pagamento.
  async masterPendingPayouts() {
    const r = await this.client.get('/admin/payouts/pending');
    return r.data.data as {
      motoristas: {
        motoristaId: string;
        nome: string | null;
        conta: {
          status: string;
          bank_code: string;
          agency: string;
          account: string;
          holder_name: string;
          cpf: string;
        } | null;
        total: number;
        earningIds: string[];
        maisAntigo: string;
      }[];
      totalAPagar: number;
    };
  }

  // Registra que o PIX foi feito à mão. `payoutRef` é o comprovante.
  async masterMarkPaid(earningIds: string[], payoutRef: string) {
    const r = await this.client.post('/admin/payouts/mark-paid', {
      earning_ids: earningIds,
      payout_ref: payoutRef,
    });
    return r.data as { pagos: number; valor: number };
  }

  async masterSetAssignment(
    campaignId: string,
    motoristaId: string,
    action: 'FORCE' | 'BLOCK' | 'CLEAR'
  ) {
    const r = await this.client.post('/admin/assignments', { campaignId, motoristaId, action });
    return r.data.data;
  }

  // ===== Carteira da empresa =====
  // As rotas de /billing respondem o objeto direto, sem o envelope { data }
  // que o resto da API usa.

  async getBalance() {
    const r = await this.client.get('/billing/balance');
    return r.data.balance as number;
  }

  // Saldo, teto de retirada e gasto real em comissão — os três que o painel
  // mostra junto. `spentOnLeads` vem do extrato, não de cálculo aqui.
  async getBillingSummary() {
    const r = await this.client.get('/billing/summary');
    return r.data as { balance: number; refundable: number; spentOnLeads: number };
  }

  async getBillingHistory(limit = 30) {
    const r = await this.client.get('/billing/history', { params: { limit } });
    return r.data.transactions as {
      id: string;
      type: 'DEPOSIT' | 'CAMPAIGN_DEBIT' | 'LEAD_PAYOUT' | 'REFUND' | 'ADJUSTMENT';
      amount: string;
      balance_after: string;
      description: string | null;
      created_at: string;
      campaign?: { id: string; title: string } | null;
      lead?: { id: string } | null;
    }[];
  }

  // Gera a cobrança PIX. O QR vem como copia-e-cola e como imagem base64.
  async createPixCheckout(amount: number) {
    const r = await this.client.post('/billing/checkout', { amount });
    return r.data as {
      payment_id: string;
      status: string;
      amount: number;
      qr_code: string;
      qr_code_base64: string;
      expira_em: string;
    };
  }

  // Pergunta ao Mercado Pago se aquele PIX já foi pago. É o que destrava o
  // saldo quando o webhook demora — creditar é idempotente, então chamar aqui
  // e o webhook chegar depois não credita duas vezes.
  async verifyPayment(payment_id: string) {
    const r = await this.client.post('/billing/verify', { payment_id });
    return r.data as { status: string; amount?: number; balance?: number };
  }

  // Menor que o saldo quando parte dele não veio de pagamento ou já foi
  // estornada — é o teto real de retirada.
  async getRefundable() {
    const r = await this.client.get('/billing/refundable');
    return r.data.refundable as number;
  }

  // Devolve saldo não usado para quem pagou, estornando no Mercado Pago. Não
  // recebe destino de propósito: o dinheiro volta pela origem.
  async refundBalance(amount: number) {
    const r = await this.client.post('/billing/refund', { amount });
    return r.data as { estornado: number; saldo: number; falhas: number };
  }

  // ===== Carteira do motorista =====

  async getDriverWallet() {
    const r = await this.client.get('/driver/wallet');
    return r.data as {
      pendente: number;
      pago: number;
      total: number;
      leadsConvertidos: number;
    };
  }

  async getDriverEarnings(limit = 50, offset = 0) {
    const r = await this.client.get('/driver/wallet/earnings', { params: { limit, offset } });
    return r.data.earnings as {
      id: string;
      amount: string;
      status: 'PENDING' | 'PAID' | 'CANCELLED';
      description: string | null;
      created_at: string;
      paid_at: string | null;
      payout_ref: string | null;
      lead_id: string | null;
    }[];
  }

  // Responde 404 quando o motorista ainda não cadastrou conta — que é um
  // estado normal, não erro. Vira null para a tela tratar como "falta cadastrar".
  async getDriverBank() {
    const r = await this.client.get('/driver/bank', {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (r.status === 404) return null;
    return r.data as {
      cpf: string;
      bank_code: string;
      agency: string;
      account: string;
      account_type: string;
      holder_name: string;
      status: string;
    } | null;
  }

  async saveDriverBank(payload: {
    cpf: string;
    bank_code: string;
    agency: string;
    account: string;
    account_type: string;
    holder_name: string;
  }) {
    const r = await this.client.post('/driver/bank', payload);
    return r.data;
  }

  // ===== Error Handling =====
  private handleError(error: any): ApiError {
    const apiError: ApiError = {
      message: 'An error occurred',
    };

    if (axios.isAxiosError(error)) {
      apiError.statusCode = error.response?.status;
      apiError.message = error.response?.data?.message || error.message;
      apiError.error = error.response?.data?.error;
    } else if (error instanceof Error) {
      apiError.message = error.message;
    }

    return apiError;
  }
}

export const apiClient = new ApiClient();
