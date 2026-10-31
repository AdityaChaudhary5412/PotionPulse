/**
 * PotionPulse · Centralized Backend API Client
 * Wraps every FastAPI endpoint with strong typings, query parameters, and error normalization.
 */

import axios, { AxiosError } from 'axios';
import {
  Ingredient,
  IngredientCreate,
  IngredientUpdate,
  Movement,
  SalePayload,
  StockChangePayload,
  RestockItem,
  PantrySummary,
  DemandDetail,
  SurgeEvent,
  SurgeEventCreate,
  AlertItem,
  HealthResponse,
  UploadSummary
} from '../types';

// Default to localhost:8000 or custom environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Extracts friendly error string from API responses
 */
export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return `Cannot connect to backend server at ${API_BASE_URL}. Ensure FastAPI is running (uvicorn backend.main:app --port 8000).`;
    }
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'detail' in data) {
      return String(data.detail);
    }
    if (error.response?.status === 404) {
      return `Endpoint not found (404) on ${API_BASE_URL}. Ensure backend is running and seeded.`;
    }
    return error.message || 'Network communication error with PotionPulse server.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export const api = {
  // 1. Health
  health: {
    check: async (): Promise<HealthResponse> => {
      const res = await client.get<HealthResponse>('/health');
      return res.data;
    },
  },

  // 2. Ingredients CRUD
  ingredients: {
    list: async (skip: number = 0, limit: number = 100): Promise<Ingredient[]> => {
      const res = await client.get<Ingredient[]>('/ingredients', { params: { skip, limit } });
      return res.data;
    },
    get: async (id: number): Promise<Ingredient> => {
      const res = await client.get<Ingredient>(`/ingredients/${id}`);
      return res.data;
    },
    create: async (data: IngredientCreate): Promise<Ingredient> => {
      const res = await client.post<Ingredient>('/ingredients', data);
      return res.data;
    },
    update: async (id: number, data: IngredientUpdate): Promise<Ingredient> => {
      const res = await client.put<Ingredient>(`/ingredients/${id}`, data);
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await client.delete(`/ingredients/${id}`);
    },
  },

  // 3. Sales & Movements
  sales: {
    record: async (payload: SalePayload): Promise<Movement> => {
      const res = await client.post<Movement>('/sales', payload);
      return res.data;
    },
  },

  stock: {
    adjust: async (ingredientId: number, payload: StockChangePayload): Promise<Ingredient> => {
      const res = await client.post<Ingredient>(`/ingredients/${ingredientId}/stock`, payload);
      return res.data;
    },
  },

  movements: {
    list: async (skip: number = 0, limit: number = 50): Promise<Movement[]> => {
      const res = await client.get<Movement[]>('/movements', { params: { skip, limit } });
      return res.data;
    },
  },

  // 4. Data Pipeline & File Uploads
  pipeline: {
    uploadSalesCsv: async (file: File): Promise<UploadSummary> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post<UploadSummary>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    predictCsv: async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post<string>('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'text',
      });
      return res.data;
    },
  },

  // 5. Restock, Stockout & Summary Intelligence
  restock: {
    list: async (withEvent: boolean = true): Promise<RestockItem[]> => {
      const res = await client.get<RestockItem[]>('/restock', {
        params: { with_event: withEvent },
      });
      return res.data;
    },
    summary: async (withEvent: boolean = true): Promise<PantrySummary> => {
      const res = await client.get<PantrySummary>('/summary', {
        params: { with_event: withEvent },
      });
      return res.data;
    },
  },

  summary: {
    get: async (withEvent: boolean = true): Promise<PantrySummary> => {
      const res = await client.get<PantrySummary>('/summary', {
        params: { with_event: withEvent },
      });
      return res.data;
    },
  },

  // 6. Demand Timeline & Confidence Bands Chart
  demand: {
    get: async (
      ingredientId: number,
      withEvent: boolean = true,
      horizon: number = 7
    ): Promise<DemandDetail> => {
      const res = await client.get<DemandDetail>(`/demand/${ingredientId}`, {
        params: { with_event: withEvent, horizon },
      });
      return res.data;
    },
  },

  // 7. Surge Events & Midnight Curse Management
  events: {
    list: async (): Promise<SurgeEvent[]> => {
      const res = await client.get<SurgeEvent[]>('/events');
      return res.data;
    },
    create: async (data: SurgeEventCreate): Promise<SurgeEvent> => {
      const res = await client.post<SurgeEvent>('/events', data);
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await client.delete(`/events/${id}`);
    },
    toggle: async (id: number): Promise<SurgeEvent> => {
      const res = await client.post<SurgeEvent>(`/events/${id}/toggle`);
      return res.data;
    },
  },

  // 8. Alerts & Anomalies
  alerts: {
    list: async (severity?: string, limit: number = 50): Promise<AlertItem[]> => {
      const res = await client.get<AlertItem[]>('/alerts', {
        params: { severity, limit },
      });
      return res.data;
    },
  },

  // 9. System Seeding
  system: {
    seed: async (): Promise<{ message: string }> => {
      const res = await client.post<{ message: string }>('/seed');
      return res.data;
    },
  },
};

export default api;
