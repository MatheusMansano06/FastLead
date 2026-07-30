// ===== Auth Types =====
export type UserType = 'driver' | 'advertiser' | 'admin';

export interface User {
  id: string;
  email: string;
  type: UserType;
  name?: string;
  fullName?: string;
  companyId?: string;
}

export interface AuthResponse {
  message: string;
  data: {
    token: string;
    refreshToken: string;
    user: User;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  type: UserType;
  fullName?: string;
  phone?: string;
  // Empresa / anunciante
  companyName?: string;
  tradeName?: string;
  cnpj?: string;
  role?: string; // cargo do responsável
  industry?: string;
  website?: string;
  // Motorista
  cpf?: string;
  city?: string;
  rideApp?: string;
  vehicle?: string;
  plate?: string;
}

// ===== Campaign Types =====
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget: number;
  pricePerLead: number;
  startDate: string;
  endDate: string;
  taxiCount: number;
  leads: number;
  roi: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  description: string;
  image: File | string;
  taxiCount: number;
  durationDays: number;
  pricePerLead: number;
  budget: number;
}

export interface CampaignsResponse {
  message: string;
  data: {
    campaigns: Campaign[];
    total: number;
  };
}

// ===== Lead Types =====
export interface Lead {
  id: string;
  campaignId: string;
  campaignName: string;
  driverId: string;
  driverName: string;
  timestamp: string;
  converted: boolean;
  metadata?: Record<string, any>;
}

export interface LeadsResponse {
  message: string;
  data: {
    leads: Lead[];
    total: number;
  };
}

// ===== Analytics Types =====
export interface Analytics {
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  conversionRate: number;
  roi: number;
  roiPercentage: number;
}

export interface AnalyticsResponse {
  message: string;
  data: Analytics;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}
