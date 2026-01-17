import React, { useRef, useState } from 'react';
import { Transaction } from '../types';
import { Search, Filter, Plus, MoreHorizontal, Wallet, ScanLine, Loader2, Upload, Check, X, FileText, User, Calendar, Edit, Eye, Trash2 } from 'lucide-react';
import { extractBillData } from '../services/geminiService';

interface ExpensesViewProps {
  transactions: Transaction[];
  onAddTransaction?: (transaction: Transaction) => void;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ transactions, onAddTransaction }) => {
  const bills = transactions.filter(t => t.type === 'Bill');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Bill Form State
  const [billForm, setBillForm] = useState<Partial<Transaction>>({
    type: 'Bill',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    entity: '',
    id: `BILL-${Date.now()}`
  });

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          const result = await extractBillData(base64String);
          if (result) {
            setBillForm({
              ...result,
              status: 'Pending',
              type: 'Bill'
            });
            setIsSheetOpen(true);
          }
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error scanning file", error);
      setIsScanning(false);
    }
  };

  const handleSaveBill = () => {
    if (billForm && onAddTransaction && billForm.entity && billForm.amount) {
      const newTransaction: Transaction = {
        id: billForm.id || `BILL-${Date.now()}`,
        date: billForm.date || new Date().toISOString().split('T')[0],
        entity: billForm.entity || 'Unknown Vendor',
        amount: billForm.amount || 0,
        status: 'Pending',
        type: 'Bill',
        dueDate: billForm.dueDate || undefined
      };
      onAddTransaction(newTransaction);
      setIsSheetOpen(false);
      // Reset form
      setBillForm({
        type: 'Bill',
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        entity: '',
        id: `BILL-${Date.now()}`
      });
    }
  };

  const openNewBillSheet = () => {
      setBillForm({
        type: 'Bill',
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        entity: '',
        id: `BILL-${Date.now()}`
      });
      setIsSheetOpen(true);
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300 relative" onClick={() => setOpenMenuId(null)}>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

       {/* Backdrop */}
       {isSheetOpen && (
        <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setIsSheetOpen(false)}
        />
      )}

      {/* Bill Entry Sheet */}
      <div className={`fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isSheetOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div>
               <h2 className="text-xl font-bold text-slate-800">Enter Vendor Bill</h2>
               <p className="text-sm text-slate-500">Record a new bill or review scanned data</p>
             </div>
             <button 
               onClick={() => setIsSheetOpen(false)} 
               className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 space-y-6">
               {/* Vendor Details */}
               <div className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Vendor Information</h3>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Vendor Name</label>
                           <div className="relative">
                               <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                               <input 
                                   type="text" 
                                   value={billForm.entity}
                                   onChange={(e) => setBillForm({...billForm, entity: e.target.value})}
                                   className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                   placeholder="Vendor Name"
                               />
                           </div>
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Bill Number</label>
                           <div className="relative">
                               <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                               <input 
                                   type="text" 
                                   value={billForm.id}
                                   onChange={(e) => setBillForm({...billForm, id: e.target.value})}
                                   className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                               />
                           </div>
                       </div>
                   </div>
               </div>

               {/* Dates */}
               <div className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Timeline</h3>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Bill Date</label>
                           <input 
                               type="date" 
                               value={billForm.date}
                               onChange={(e) => setBillForm({...billForm, date: e.target.value})}
                               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-600"
                           />
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Due Date</label>
                           <input 
                               type="date" 
                               value={billForm.dueDate || ''}
                               onChange={(e) => setBillForm({...billForm, dueDate: e.target.value})}
                               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-600"
                           />
                       </div>
                   </div>
               </div>

               {/* Financials */}
               <div className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Financials</h3>
                   <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-600">Total Amount</label>
                       <div className="relative">
                           <span className="absolute left-3 top-2 text-slate-500 font-semibold">$</span>
                           <input 
                               type="number" 
                               value={billForm.amount}
                               onChange={(e) => setBillForm({...billForm, amount: parseFloat(e.target.value)})}
                               className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                               placeholder="0.00"
                           />
                       </div>
                   </div>
               </div>
           </div>

           <div className="p-6 border-t border-slate-100 bg-slate-50">
               <div className="flex space-x-3">
                   <button 
                       onClick={() => setIsSheetOpen(false)}
                       className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                   >
                       Cancel
                   </button>
                   <button 
                       onClick={handleSaveBill}
                       disabled={!billForm.entity || !billForm.amount}
                       className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex justify-center items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       <Check className="w-4 h-4" />
                       <span>Save Bill</span>
                   </button>
               </div>
           </div>
      </div>

      {/* Header Toolbar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Purchases & Bills</h2>
          <p className="text-slate-500 text-sm">Manage vendor bills and outgoing payments</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleScanClick}
            disabled={isScanning}
            className="bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 text-slate-600 px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <ScanLine className="w-4 h-4" />}
            <span className="font-medium text-sm">{isScanning ? 'Analyzing...' : 'AI Auto-Scan'}</span>
          </button>
          <button 
            onClick={openNewBillSheet}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Enter Bill</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex space-x-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search vendors or bill #..." 
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent outline-none text-slate-700"
          />
        </div>
        <div className="h-full w-px bg-slate-200 mx-2"></div>
        <button className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-semibold uppercase">Open Bills</p>
             <h3 className="text-xl font-bold text-slate-800 mt-1">{bills.filter(b => b.status === 'Pending').length}</h3>
           </div>
           <div className="p-2 bg-amber-50 rounded-lg">
             <Wallet className="w-5 h-5 text-amber-500" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-semibold uppercase">Overdue Amount</p>
             <h3 className="text-xl font-bold text-red-600 mt-1">
               ${bills.filter(b => b.status === 'Overdue').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
             </h3>
           </div>
           <div className="p-2 bg-red-50 rounded-lg">
             <Wallet className="w-5 h-5 text-red-500" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-semibold uppercase">Paid (Last 30 Days)</p>
             <h3 className="text-xl font-bold text-emerald-600 mt-1">
               ${bills.filter(b => b.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
             </h3>
           </div>
           <div className="p-2 bg-emerald-50 rounded-lg">
             <Wallet className="w-5 h-5 text-emerald-500" />
           </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-visible h-full">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></th>
                <th className="px-6 py-4">Bill #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 group transition-colors cursor-pointer relative">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="px-6 py-4 font-medium text-slate-700">#{t.id}</td>
                  <td className="px-6 py-4 text-slate-600">{t.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                        {t.entity.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">{t.entity}</span>
                    </div>
                  </td>
                   <td className="px-6 py-4 text-slate-600">{t.dueDate || 'N/A'}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      t.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                      t.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                        onClick={(e) => toggleMenu(t.id, e)}
                        className={`p-1 rounded transition-colors ${openMenuId === t.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                     {/* Dropdown Menu */}
                    {openMenuId === t.id && (
                        <div className="absolute right-8 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                            <button 
                                onClick={(e) => { e.stopPropagation(); /* View logic */ setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <Eye className="w-4 h-4 mr-2 text-slate-400" /> View Details
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit Bill
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button 
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        No bills found for this period.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpensesView;
