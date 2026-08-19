export enum UserType {
  DRIVER = 'driver',
  ADVERTISER = 'advertiser',
  ADMIN = 'admin',
}

export interface AuthPayload {
  id: string;
  email: string;
  type: UserType;
  companyId?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  type: UserType;
  fullName?: string;
  phone?: string;
  companyId?: string;

  // Empresa / anunciante
  companyName?: string;
  tradeName?: string;
  cnpj?: string;
  role?: string;
  industry?: string;
  website?: string;

  // Motorista
  cpf?: string;
  city?: string;
  rideApp?: string;
  vehicle?: string;
  plate?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    type: UserType;
    companyId?: string;
    name?: string;
    /** Foto de perfil como data-URL. O cabeçalho cai nas iniciais sem ela. */
    avatarUrl?: string | null;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  /** Motivo estável da recusa (ex.: TABLET_NOT_PAIRED) — a tela reage a ele. */
  code?: string;
  /** Só preenchido em desenvolvimento — nunca vaza stack trace em produção. */
  stack?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
