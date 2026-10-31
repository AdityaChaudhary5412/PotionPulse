/**
 * PotionPulse · TypeScript Data Contracts & Domain Models
 */

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  lead_time_days: number;
}

export interface IngredientCreate {
  name: string;
  unit: string;
  current_stock: number;
  lead_time_days: number;
}

export interface IngredientUpdate {
  name?: string;
  unit?: string;
  current_stock?: number;
  lead_time_days?: number;
}

export interface Movement {
  id: number;
  ingredient_id: number;
  ts: string;
  type: 'sale' | 'restock' | 'adjustment';
  qty: number;
  note?: string;
}

export interface SalePayload {
  ingredient_id: number;
  qty: number;
  note?: string;
}

export interface StockChangePayload {
  qty: number;
  type?: 'restock' | 'adjustment';
  note?: string;
}

export type InventoryStatus = 'safe' | 'low' | 'critical';

export interface RestockItem {
  ingredient_id: number;
  ingredient: string;
  stock: number;
  unit: string;
  days_until_stockout: number;
  status: InventoryStatus;
  reorder_qty: number;
  safety_stock?: number;
  lead_time_days?: number;
  daily_demand?: number;
  active_multiplier?: number;
}

export interface PantrySummary {
  low_count: number;
  critical_count: number;
  safe_count?: number;
  alerts_today: number;
  nearest_stockout_days: number;
  total_ingredients: number;
}

export interface DemandHistoryPoint {
  date: string;
  actual: number;
}

export interface DemandForecastPoint {
  date: string;
  predicted_qty: number;
  lo: number;
  hi: number;
}

export interface DemandChartPoint {
  date: string;
  actual?: number | null;
  forecast?: number | null;
  lo?: number | null;
  hi?: number | null;
}

export interface DemandDetail {
  ingredient_id: number;
  ingredient: string;
  unit: string;
  current_stock: number;
  with_event: boolean;
  active_multiplier: number;
  history: DemandHistoryPoint[];
  forecast: DemandForecastPoint[];
  chart_data: DemandChartPoint[];
}

export interface SurgeEvent {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  ingredient_ids: number[];
  multiplier: number;
  active: boolean;
}

export interface SurgeEventCreate {
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  ingredient_ids: number[];
  multiplier: number;
  active?: boolean;
}

export interface AlertItem {
  id: number;
  ingredient_id?: number | null;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ts: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  timestamp: string;
  total_ingredients: number;
  total_movements: number;
  active_alerts: number;
}

export interface UploadSummary {
  status: string;
  message: string;
  total_rows: number;
  accepted_count: number;
  rejected_count: number;
  rejection_reasons: Record<string, string[]>;
}

export interface AgentCommandResponse {
  success: boolean;
  intent: string;
  thought: string;
  plan: string[];
  actions_taken: string[];
  result: string;
  suggestions: string[];
  data?: Record<string, any> | null;
}
