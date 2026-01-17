import React, { useState } from 'react';
import { ViewState, Company } from '../types';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Wallet, 
  Package, 
  BarChart3, 
  Settings, 
  Hexagon,
  ChevronsUpDown,
  Plus,
  Check,
  Building2
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  companies: Company[];
  activeCompanyId: string;
  onSwitchCompany: (id: string) => void;
  onAddCompany: (name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  companies, 
  activeCompanyId, 
  onSwitchCompany,
  onAddCompany
}) => {
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.SALES, label: 'Sales & Invoicing', icon: ShoppingCart },
    { id: ViewState.EXPENSES, label: 'Purchases & Bills', icon: Wallet },
    { id: ViewState.INVENTORY, label: 'Inventory', icon: Package },
    { id: ViewState.REPORTS, label: 'Reports', icon: BarChart3 },
    { id: ViewState.SETTINGS, label: 'System', icon: Settings },
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCompanyName.trim()) {
      onAddCompany(newCompanyName);
      setNewCompanyName('');
      setIsAddingCompany(false);
      setIsCompanyMenuOpen(false);
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-700 shadow-xl z-20">
      {/* Company Switcher Header */}
      <div className="p-4 border-b border-slate-800 relative">
        <button 
          onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-900/20">
              <Hexagon className="w-5 h-5 fill-white/20" />
            </div>
            <div className="text-left">
              <h1 className="font-bold text-sm text-white leading-tight">{activeCompany.name}</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Professional</p>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
        </button>

        {/* Dropdown Menu */}
        {isCompanyMenuOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Switch Company
              </div>
              {companies.map(company => (
                <button
                  key={company.id}
                  onClick={() => {
                    onSwitchCompany(company.id);
                    setIsCompanyMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm ${
                    company.id === activeCompanyId 
                      ? 'bg-emerald-600/10 text-emerald-400' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 opacity-70" />
                    <span className="truncate max-w-[120px]">{company.name}</span>
                  </div>
                  {company.id === activeCompanyId && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
            
            <div className="p-2 border-t border-slate-700 bg-slate-800/50">
              {!isAddingCompany ? (
                <button 
                  onClick={() => setIsAddingCompany(true)}
                  className="w-full flex items-center justify-center space-x-2 px-2 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 text-xs font-medium transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Company</span>
                </button>
              ) : (
                <form onSubmit={handleAddSubmit} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <div className="flex space-x-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1 rounded text-xs font-medium"
                    >
                      Add
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAddingCompany(false)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 rounded text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            JD
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">John Doe</p>
            <p className="text-xs text-slate-400 truncate">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
