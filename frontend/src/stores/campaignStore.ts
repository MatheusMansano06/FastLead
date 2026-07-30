import { create } from 'zustand';
import { Campaign, Analytics } from '../types';
import { apiClient } from '../services/api';

interface CampaignStore {
  // State
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  analytics: Analytics | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  fetchCampaigns: (page?: number, limit?: number) => Promise<void>;
  createCampaign: (data: any) => Promise<void>;
  updateCampaign: (id: string, data: any) => Promise<void>;
  selectCampaign: (campaign: Campaign | null) => void;
  fetchAnalytics: (campaignId?: string, startDate?: string, endDate?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  campaigns: [],
  selectedCampaign: null,
  analytics: null,
  isLoading: false,
  error: null,
  total: 0,

  fetchCampaigns: async (page = 1, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getCampaigns(page, limit);
      set({
        campaigns: response.data.campaigns,
        total: response.data.total,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch campaigns',
        isLoading: false,
      });
    }
  },

  createCampaign: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.createCampaign(data);
      // Refetch campaigns after creation
      const response = await apiClient.getCampaigns(1, 10);
      set({
        campaigns: response.data.campaigns,
        total: response.data.total,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create campaign',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCampaign: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.updateCampaign(id, data);
      // Refetch campaigns after update
      const response = await apiClient.getCampaigns(1, 10);
      set({
        campaigns: response.data.campaigns,
        total: response.data.total,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update campaign',
        isLoading: false,
      });
      throw error;
    }
  },

  selectCampaign: (campaign: Campaign | null) => {
    set({ selectedCampaign: campaign });
  },

  fetchAnalytics: async (campaignId?: string, startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getCampaignAnalytics(campaignId, startDate, endDate);
      set({
        analytics: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch analytics',
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      campaigns: [],
      selectedCampaign: null,
      analytics: null,
      isLoading: false,
      error: null,
      total: 0,
    });
  },
}));
