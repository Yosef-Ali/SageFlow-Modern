import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SalesView from './components/SalesView';
import ExpensesView from './components/ExpensesView';
import InventoryView from './components/InventoryView';
import AICopilot from './components/AICopilot';
import { ViewState, Transaction, Company, KPI, InventoryItem } from './types';
import { Sparkles, Bell, HelpCircle } from 'lucide-react';

// Mock Data for Multiple Companies
const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp_001',
    name: 'TechFlow Systems',
    initials: 'TF',
    transactions: [
      { 
        id: 'INV-001', 
        date: '2023-10-25', 
        entity: 'Acme Corp', 
        amount: 4500.00, 
        status: 'Overdue', 
        type: 'Invoice', 
        dueDate: '2023-11-25',
        payments: [
          { id: 'PAY-001', date: '2023-11-01', amount: 1000.00, method: 'Check #1024' }
        ]
      },
      { 
        id: 'INV-002', 
        date: '2023-10-28', 
        entity: 'Globex Inc', 
        amount: 2300.50, 
        status: 'Paid', 
        type: 'Invoice', 
        dueDate: '2023-11-28',
        payments: [
          { id: 'PAY-002', date: '2023-11-15', amount: 2300.50, method: 'Bank Transfer' }
        ]
      },
      { id: 'BILL-104', date: '2023-10-29', entity: 'Office Depot', amount: 432.00, status: 'Paid', type: 'Bill', dueDate: '2023-11-15' },
      { id: 'INV-003', date: '2023-11-01', entity: 'Stark Ind', amount: 12500.00, status: 'Pending', type: 'Invoice', dueDate: '2023-12-01', payments: [] },
      { id: 'BILL-105', date: '2023-11-05', entity: 'AWS Cloud', amount: 1200.00, status: 'Pending', type: 'Bill', dueDate: '2023-12-05' },
      { id: 'BILL-106', date: '2023-11-10', entity: 'WeWork', amount: 3500.00, status: 'Pending', type: 'Bill', dueDate: '2023-12-01' },
      { id: 'BILL-107', date: '2023-09-15', entity: 'Legal Zoom', amount: 800.00, status: 'Overdue', type: 'Bill', dueDate: '2023-10-15' },
    ],
    inventory: [
        { id: 'ITM-001', sku: 'HW-LAP-001', name: 'ProBook G8 Laptop', category: 'Hardware', quantityOnHand: 5, reorderPoint: 10, costPrice: 800, sellingPrice: 1200, unit: 'pcs' },
        { id: 'ITM-002', sku: 'SW-LIC-005', name: 'Cloud Server License', category: 'Software', quantityOnHand: 50, reorderPoint: 5, costPrice: 100, sellingPrice: 250, unit: 'lic' },
        { id: 'ITM-003', sku: 'ACC-MOU-001', name: 'Wireless Mouse', category: 'Accessories', quantityOnHand: 2, reorderPoint: 15, costPrice: 15, sellingPrice: 45, unit: 'pcs' },
        { id: 'ITM-004', sku: 'HW-MON-027', name: '27" 4K Monitor', category: 'Hardware', quantityOnHand: 12, reorderPoint: 5, costPrice: 300, sellingPrice: 550, unit: 'pcs' },
    ]
  },
  {
    id: 'comp_002',
    name: 'GreenLeaf Logistics',
    initials: 'GL',
    transactions: [
      { id: 'INV-901', date: '2023-11-10', entity: 'Whole Foods', amount: 840.00, status: 'Paid', type: 'Invoice', dueDate: '2023-12-10', payments: [{ id: 'PAY-901', date: '2023-11-12', amount: 840.00, method: 'Credit Card' }] },
      { id: 'BILL-202', date: '2023-11-12', entity: 'Shell Oil', amount: 1500.00, status: 'Pending', type: 'Bill', dueDate: '2023-12-12' },
      { id: 'INV-902', date: '2023-11-15', entity: 'Trader Joes', amount: 3200.00, status: 'Pending', type: 'Invoice', dueDate: '2023-12-15', payments: [] },
      { id: 'BILL-203', date: '2023-11-18', entity: 'Maintenance Co', amount: 450.00, status: 'Paid', type: 'Bill', dueDate: '2023-11-30' },
    ],
    inventory: [
        { id: 'ITM-501', sku: 'PKG-BOX-L', name: 'Large Shipping Box', category: 'Packaging', quantityOnHand: 500, reorderPoint: 1000, costPrice: 1.5, sellingPrice: 3.0, unit: 'pcs' },
        { id: 'ITM-502', sku: 'PKG-TAPE', name: 'Industrial Tape', category: 'Packaging', quantityOnHand: 150, reorderPoint: 50, costPrice: 5, sellingPrice: 12, unit: 'roll' },
    ]
  }
];

const getKPIsForCompany = (companyId: string): KPI[] => {
  if (companyId === 'comp_001') {
    return [
      { label: 'Total Revenue', value: '$54,230.00', trend: 12.5, trendDirection: 'up' },
      { label: 'Total Expenses', value: '$32,100.50', trend: 2.1, trendDirection: 'down' },
      { label: 'Net Profit', value: '$22,129.50', trend: 8.4, trendDirection: 'up' },
      { label: 'Outstanding Invoices', value: '$4,500.00', trend: 15.3, trendDirection: 'up' },
    ];
  } else {
    // GreenLeaf Logistics - maybe struggling a bit
    return [
      { label: 'Total Revenue', value: '$12,450.00', trend: 5.2, trendDirection: 'down' },
      { label: 'Total Expenses', value: '$14,200.00', trend: 8.1, trendDirection: 'up' },
      { label: 'Net Profit', value: '-$1,750.00', trend: 12.4, trendDirection: 'down' },
      { label: 'Outstanding Invoices', value: '$850.00', trend: 2.1, trendDirection: 'down' },
    ];
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [activeCompanyId, setActiveCompanyId] = useState<string>(INITIAL_COMPANIES[0].id);

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];
  const companyKPIs = getKPIsForCompany(activeCompanyId);

  const handleAddCompany = (name: string) => {
    const newCompany: Company = {
      id: `comp_${Date.now()}`,
      name: name,
      initials: name.substring(0, 2).toUpperCase(),
      transactions: [],
      inventory: []
    };
    setCompanies([...companies, newCompany]);
    setActiveCompanyId(newCompany.id);
  };

  const handleAddTransaction = (transaction: Transaction) => {
    const updatedCompanies = companies.map(c => {
      if (c.id === activeCompanyId) {
        return {
          ...c,
          transactions: [transaction, ...c.transactions]
        };
      }
      return c;
    });
    setCompanies(updatedCompanies);
  };

  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    const updatedCompanies = companies.map(c => {
      if (c.id === activeCompanyId) {
        return {
          ...c,
          inventory: c.inventory.map(item => item.id === updatedItem.id ? updatedItem : item)
        };
      }
      return c;
    });
    setCompanies(updatedCompanies);
  };

  const handleAddInventoryItem = (newItem: InventoryItem) => {
    const updatedCompanies = companies.map(c => {
      if (c.id === activeCompanyId) {
        return {
          ...c,
          inventory: [newItem, ...c.inventory]
        };
      }
      return c;
    });
    setCompanies(updatedCompanies);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard recentTransactions={activeCompany.transactions} kpis={companyKPIs} />;
      case ViewState.SALES:
        return <SalesView transactions={activeCompany.transactions} onAddTransaction={handleAddTransaction} company={activeCompany} />;
      case ViewState.EXPENSES:
        return <ExpensesView transactions={activeCompany.transactions} onAddTransaction={handleAddTransaction} />;
      case ViewState.INVENTORY:
        return <InventoryView inventory={activeCompany.inventory} onUpdateItem={handleUpdateInventoryItem} onAddItem={handleAddInventoryItem} />;
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
             <div className="bg-slate-100 p-8 rounded-full mb-4">
                <HelpCircle className="w-16 h-16 text-slate-300" />
             </div>
             <h2 className="text-xl font-semibold text-slate-600">Module Under Construction</h2>
             <p className="max-w-md text-center mt-2">The {currentView.toLowerCase()} module is being updated to the new modern framework.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSwitchCompany={setActiveCompanyId}
        onAddCompany={handleAddCompany}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          {/* Breadcrumb / Title */}
          <div className="flex items-center text-sm font-medium text-slate-500">
             <span className="text-emerald-600 font-semibold">{activeCompany.name}</span>
             <span className="mx-2 text-slate-300">/</span>
             <span className="text-slate-800 capitalize">{currentView.toLowerCase().replace('_', ' ')}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button 
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-300 ${
                isCopilotOpen 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' 
                  : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-600 shadow-sm'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isCopilotOpen ? 'fill-emerald-200' : ''}`} />
              <span className="font-medium text-sm">AI Assistant</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-auto p-6 relative">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* AI Copilot Panel */}
      <AICopilot 
        transactions={activeCompany.transactions}
        kpis={companyKPIs}
        companyName={activeCompany.name}
        isOpen={isCopilotOpen} 
        onClose={() => setIsCopilotOpen(false)} 
        currentView={currentView}
      />
    </div>
  );
};

export default App;