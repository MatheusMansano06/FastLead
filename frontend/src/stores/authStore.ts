import { create } from 'zustand';
import { User, LoginPayload, RegisterPayload, UserType } from '../types';
import { apiClient } from '../services/api';

const USER_KEY = 'fl_user';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persistUser(user: User | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

/** Rota inicial de cada perfil após o login. */
export function homePathFor(type?: UserType): string {
  if (type === 'driver') return '/app/motorista';
  if (type === 'admin') return '/master';
  return '/app/empresa';
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => void;
  /**
   * Troca a foto de perfil já carregada, sem refazer o login.
   *
   * O usuário do cabeçalho vem do que foi salvo no login, então uma foto nova
   * só apareceria lá no próximo acesso — o motorista trocaria a foto, olharia
   * para o canto da tela e veria a inicial antiga.
   */
  setAvatar: (avatarUrl: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: loadUser(),
  isLoading: false,
  error: null,
  isAuthenticated: apiClient.isAuthenticated(),

  login: async (payload: LoginPayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.login(payload);
      const user = response.data.user;
      persistUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error: any) {
      set({ error: error.message || 'Falha no login', isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.register(payload);
      const user = response.data.user;
      persistUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error: any) {
      set({ error: error.message || 'Falha no cadastro', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.logout();
    } catch (error: any) {
      // best-effort; limpamos o estado de qualquer forma
    } finally {
      persistUser(null);
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),

  checkAuth: () => set({ isAuthenticated: apiClient.isAuthenticated(), user: loadUser() }),

  setAvatar: (avatarUrl: string | null) => {
    const atual = get().user;
    if (!atual) return;
    const user = { ...atual, avatarUrl };
    persistUser(user);
    set({ user });
  },
}));
