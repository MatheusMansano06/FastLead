import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse, LoginPayload, RegisterPayload, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  async createCampaign(data: any) {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('budget', data.budget);
      formData.append('pricePerLead', data.pricePerLead);
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('taxiCount', data.taxiCount);

      if (data.image instanceof File) {
        formData.append('image', data.image);
      }

      const response = await this.client.post('/advertiser/campaigns', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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

  async getLeads(page = 1, limit = 20) {
    try {
      const response = await this.client.get('/advertiser/leads', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
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

  // ===== MASTER (admin) =====
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

  async masterSetAssignment(campaignId: string, motoristaId: string, action: 'FORCE' | 'BLOCK' | 'CLEAR') {
    const r = await this.client.post('/admin/assignments', { campaignId, motoristaId, action });
    return r.data.data;
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
