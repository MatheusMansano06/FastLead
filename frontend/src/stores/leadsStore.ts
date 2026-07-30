import { create } from 'zustand';
import { Lead } from '../types';
import { apiClient } from '../services/api';

interface LeadsStore {
  // State
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  fetchLeads: (page?: number, limit?: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useLeadsStore = create<LeadsStore>((set) => ({
  leads: [],
  isLoading: false,
  error: null,
  total: 0,

  fetchLeads: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getLeads(page, limit);
      set({
        leads: response.data.leads,
        total: response.data.total,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch leads',
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      leads: [],
      isLoading: false,
      error: null,
      total: 0,
    });
  },
}));
