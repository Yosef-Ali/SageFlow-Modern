// Electron API types for SageFlow
// This file defines the types for the Electron IPC bridge

export interface PTBImportResult {
  success: boolean;
  data?: {
    chart_of_accounts: ChartOfAccountImport[];
    customers: CustomerImport[];
    vendors: VendorImport[];
    employees: EmployeeImport[];
    inventory: InventoryImport[];
    company_info: {
      name: string;
      additional: string[];
    } | null;
  };
  error?: string;
  stats?: {
    totalFiles: number;
    totalAccounts: number;
    totalCustomers: number;
    totalVendors: number;
    totalEmployees: number;
    totalInventory: number;
    accountsWithBalances: number;
    balanceSummary: {
      assets: number;
      liabilities: number;
      equity: number;
      revenue: number;
      expenses: number;
    };
  };
}

export interface ChartOfAccountImport {
  account_number: string;
  account_name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
}

export interface CustomerImport {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  balance?: number;
}

export interface VendorImport {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  balance?: number;
}

export interface EmployeeImport {
  first_name: string;
  last_name: string;
}

export interface InventoryImport {
  name: string;
  description: string;
}

export interface PTBExportData {
  chart_of_accounts?: ChartOfAccountImport[];
  customers?: CustomerImport[];
  vendors?: VendorImport[];
  employees?: EmployeeImport[];
  inventory?: InventoryImport[];
  company_info?: {
    name: string;
  };
}

export interface PTBExportResult {
  success: boolean;
  path?: string;
  error?: string;
  stats?: {
    accounts: number;
    customers: number;
    vendors: number;
  };
}

export interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  isDev: () => Promise<boolean>;
  platform: string;

  // Theme support
  getTheme: () => Promise<'dark' | 'light'>;
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<void>;
  onThemeChange: (callback: (theme: 'dark' | 'light') => void) => void;

  // License & Machine ID
  getMachineId: () => Promise<string>;

  // PTB Import/Export
  ptb: {
    import: () => Promise<PTBImportResult>;
    importFromPath: (filePath: string) => Promise<PTBImportResult>;
    export: (data: PTBExportData) => Promise<PTBExportResult>;
    exportToPath: (data: PTBExportData, outputPath: string) => Promise<PTBExportResult>;
    onProgress: (callback: (progress: { status: string; message: string }) => void) => void;
  };

  // Check if running in Electron
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
