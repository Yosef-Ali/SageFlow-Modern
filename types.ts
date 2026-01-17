export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SALES = 'SALES',
  EXPENSES = 'EXPENSES',
  INVENTORY = 'INVENTORY',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS'
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
}

export interface Transaction {
  id: string;
  date: string;
  entity: string; // Customer or Vendor name
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  type: 'Invoice' | 'Bill';
  dueDate?: string;
  payments?: Payment[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantityOnHand: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  image?: string; // Base64 encoded image string
}

export interface Company {
  id: string;
  name: string;
  initials: string;
  transactions: Transaction[];
  inventory: InventoryItem[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  secondary?: number;
}

export interface KPI {
  label: string;
  value: string;
  trend: number; // percentage
  trendDirection: 'up' | 'down';
}

export interface AIResponse {
  text: string;
  error?: string;
}

// AI Copilot Types
export interface WidgetAction {
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  actionId: string;
}

export interface CopilotWidget {
  type: 'review-card' | 'list-card' | 'action-card';
  title: string;
  description?: string;
  data?: any;
  actions?: WidgetAction[];
  status?: 'pending' | 'completed' | 'cancelled'; // UI state
}

export interface CopilotResponse {
  text: string;
  widget?: CopilotWidget;
}