import React, { useState, useRef } from 'react';
import { Transaction, Company } from '../types';
import { Search, Filter, Plus, FileText, MoreHorizontal, X, CreditCard, Calendar, User, ScanLine, Loader2, Check, Edit, Trash2, Eye, Printer, Download, Palette, LayoutTemplate } from 'lucide-react';
import { extractBillData } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface SalesViewProps {
  transactions: Transaction[];
  company: Company;
  onAddTransaction?: (transaction: Transaction) => void;
}

type InvoiceTemplate = 'modern' | 'classic' | 'minimalist';

const SalesView: React.FC<SalesViewProps> = ({ transactions, company, onAddTransaction }) => {
  const invoices = transactions.filter(t => t.type === 'Invoice');
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Preview State
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<InvoiceTemplate>('modern');
  const [brandColor, setBrandColor] = useState('#10b981'); // Default Emerald
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const invoicePdfRef = useRef<HTMLDivElement>(null);

  // New Invoice Form State
  const [newInvoiceData, setNewInvoiceData] = useState<Partial<Transaction>>({
    type: 'Invoice',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    entity: '',
    id: `INV-${Date.now()}`
  });

  const calculateBalance = (invoice: Transaction) => {
    const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return invoice.amount - totalPaid;
  };

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
                // We reuse extractBillData as it extracts standard fields (Entity, Amount, Date, ID)
                const result = await extractBillData(base64String);
                if (result) {
                    setNewInvoiceData({
                        ...newInvoiceData,
                        ...result,
                        type: 'Invoice',
                        status: 'Pending'
                    });
                    setIsSheetOpen(true); // Open the sheet to review
                }
            }
            setIsScanning(false);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error("Error scanning invoice", error);
        setIsScanning(false);
    }
  };

  const handleSaveInvoice = () => {
      if (onAddTransaction && newInvoiceData.entity && newInvoiceData.amount) {
          onAddTransaction({
              id: newInvoiceData.id || `INV-${Date.now()}`,
              date: newInvoiceData.date || new Date().toISOString().split('T')[0],
              entity: newInvoiceData.entity,
              amount: newInvoiceData.amount,
              status: newInvoiceData.status || 'Pending',
              type: 'Invoice',
              dueDate: newInvoiceData.dueDate,
              payments: []
          } as Transaction);
          setIsSheetOpen(false);
          setNewInvoiceData({ // Reset form
            type: 'Invoice',
            status: 'Pending',
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            entity: '',
            id: `INV-${Date.now()}`
          });
      }
  };

  const handleDownloadPDF = async () => {
    if (!invoicePdfRef.current || !selectedInvoice) return;
    
    setIsGeneratingPdf(true);
    
    try {
        const canvas = await html2canvas(invoicePdfRef.current, {
            scale: 2, // Improve quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Invoice_${selectedInvoice.id}.pdf`);
    } catch (error) {
        console.error("PDF Generation failed", error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  // --- Invoice Template Renderers ---

  const renderInvoiceContent = () => {
      if (!selectedInvoice) return null;

      const items = [
          { desc: 'Professional Services', qty: 1, rate: selectedInvoice.amount * 0.4, amount: selectedInvoice.amount * 0.4 },
          { desc: 'Software License', qty: 2, rate: selectedInvoice.amount * 0.3, amount: selectedInvoice.amount * 0.6 }
      ]; // Mock items for visualization

      // -- MODERN TEMPLATE --
      if (pdfTemplate === 'modern') {
          return (
              <div className="w-full h-full bg-white text-slate-800 flex flex-col font-sans" style={{ minHeight: '1122px' }}>
                  {/* Header Bar */}
                  <div className="h-4 w-full" style={{ backgroundColor: brandColor }}></div>
                  
                  <div className="p-12 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-16">
                          <div>
                              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4" style={{ backgroundColor: brandColor }}>
                                  {company.initials}
                              </div>
                              <h1 className="text-xl font-bold">{company.name}</h1>
                              <p className="text-sm text-slate-500 mt-1">123 Business Rd, Suite 100<br/>San Francisco, CA 94107</p>
                          </div>
                          <div className="text-right">
                              <h2 className="text-4xl font-bold text-slate-200 uppercase tracking-widest mb-2">Invoice</h2>
                              <p className="text-lg font-semibold text-slate-700">#{selectedInvoice.id}</p>
                              <p className="text-sm text-slate-500">{selectedInvoice.date}</p>
                          </div>
                      </div>

                      <div className="flex justify-between mb-16">
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
                              <h3 className="text-lg font-bold text-slate-800">{selectedInvoice.entity}</h3>
                              <p className="text-sm text-slate-500">Client Address Line 1<br/>City, State, Zip</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Due</p>
                              <h3 className="text-3xl font-bold" style={{ color: brandColor }}>${selectedInvoice.amount.toLocaleString()}</h3>
                              <p className="text-sm text-red-500 font-medium mt-1">{selectedInvoice.dueDate ? `Due by ${selectedInvoice.dueDate}` : 'Due on Receipt'}</p>
                          </div>
                      </div>

                      <table className="w-full mb-8">
                          <thead>
                              <tr className="text-left" style={{ backgroundColor: `${brandColor}15` }}> {/* 10% opacity hex */}
                                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: brandColor }}>Description</th>
                                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: brandColor }}>Qty</th>
                                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: brandColor }}>Rate</th>
                                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: brandColor }}>Amount</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {items.map((item, i) => (
                                  <tr key={i}>
                                      <td className="py-4 px-4 text-sm font-medium">{item.desc}</td>
                                      <td className="py-4 px-4 text-sm text-right text-slate-500">{item.qty}</td>
                                      <td className="py-4 px-4 text-sm text-right text-slate-500">${item.rate.toLocaleString()}</td>
                                      <td className="py-4 px-4 text-sm font-bold text-right text-slate-700">${item.amount.toLocaleString()}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      <div className="flex justify-end mt-4 border-t border-slate-200 pt-8">
                          <div className="w-64 space-y-3">
                              <div className="flex justify-between text-sm text-slate-500">
                                  <span>Subtotal</span>
                                  <span>${selectedInvoice.amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-slate-500">
                                  <span>Tax (0%)</span>
                                  <span>$0.00</span>
                              </div>
                              <div className="flex justify-between text-lg font-bold text-slate-800 border-t border-slate-200 pt-3">
                                  <span>Total</span>
                                  <span>${selectedInvoice.amount.toLocaleString()}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="mt-auto pt-12 text-center text-sm text-slate-400">
                          <p>Thank you for your business!</p>
                      </div>
                  </div>
              </div>
          );
      }

      // -- CLASSIC TEMPLATE --
      if (pdfTemplate === 'classic') {
        return (
            <div className="w-full h-full bg-white text-slate-900 flex flex-col font-serif" style={{ minHeight: '1122px' }}>
                <div className="p-16 flex-1 flex flex-col border-4 border-double border-slate-200 m-8">
                    <div className="text-center mb-12 border-b border-slate-300 pb-8">
                        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">{company.name}</h1>
                        <p className="text-sm italic text-slate-600">Professional Business Solutions</p>
                    </div>

                    <div className="flex justify-between mb-12">
                         <div className="w-1/2">
                            <h3 className="font-bold text-sm uppercase text-slate-500 mb-1">Invoiced To:</h3>
                            <p className="font-semibold text-lg">{selectedInvoice.entity}</p>
                            <p className="text-sm text-slate-600">Client Address Line 1</p>
                         </div>
                         <div className="w-1/2 text-right">
                             <div className="inline-block text-left">
                                <div className="flex justify-between w-48 mb-1">
                                    <span className="font-bold text-slate-500 text-sm uppercase">Invoice No:</span>
                                    <span className="font-mono">{selectedInvoice.id}</span>
                                </div>
                                <div className="flex justify-between w-48">
                                    <span className="font-bold text-slate-500 text-sm uppercase">Date:</span>
                                    <span>{selectedInvoice.date}</span>
                                </div>
                             </div>
                         </div>
                    </div>

                    <div className="flex justify-center mb-12">
                        <span className="px-8 py-2 border border-slate-800 text-xl font-bold tracking-widest uppercase">Invoice</span>
                    </div>

                    <table className="w-full mb-8 border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-300 py-2 px-4 text-left font-bold uppercase text-xs">Description</th>
                                <th className="border border-slate-300 py-2 px-4 text-center font-bold uppercase text-xs w-20">Qty</th>
                                <th className="border border-slate-300 py-2 px-4 text-right font-bold uppercase text-xs w-32">Unit Price</th>
                                <th className="border border-slate-300 py-2 px-4 text-right font-bold uppercase text-xs w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td className="border border-slate-300 py-3 px-4 text-sm">{item.desc}</td>
                                    <td className="border border-slate-300 py-3 px-4 text-sm text-center">{item.qty}</td>
                                    <td className="border border-slate-300 py-3 px-4 text-sm text-right">${item.rate.toLocaleString()}</td>
                                    <td className="border border-slate-300 py-3 px-4 text-sm text-right font-semibold">${item.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end mt-4">
                        <div className="w-64">
                            <div className="flex justify-between py-2 border-b border-slate-300">
                                <span className="font-bold text-sm">Total Due</span>
                                <span className="font-bold text-lg">${selectedInvoice.amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-12 border-t border-slate-300 text-center text-xs text-slate-500">
                        <p>{company.name} | 123 Business Rd, Suite 100, San Francisco, CA | contact@techflow.com</p>
                    </div>
                </div>
            </div>
        );
      }

      // -- MINIMALIST TEMPLATE --
      return (
        <div className="w-full h-full bg-white text-slate-900 flex flex-col font-mono" style={{ minHeight: '1122px' }}>
             <div className="p-16 flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-20 border-b-2 border-black pb-6">
                    <h1 className="text-4xl font-bold tracking-tighter">{company.name}</h1>
                    <div className="text-right">
                        <p className="text-sm">INVOICE #{selectedInvoice.id}</p>
                        <p className="text-sm">{selectedInvoice.date}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-20">
                    <div>
                        <p className="text-xs text-slate-400 mb-2">FROM</p>
                        <p className="font-bold">{company.name}</p>
                        <p className="text-sm mt-1">123 Business Rd<br/>San Francisco, CA</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 mb-2">TO</p>
                        <p className="font-bold">{selectedInvoice.entity}</p>
                        <p className="text-sm mt-1">Client Address<br/>City, State</p>
                    </div>
                </div>

                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="text-left py-2 font-bold text-sm">ITEM</th>
                            <th className="text-right py-2 font-bold text-sm">QTY</th>
                            <th className="text-right py-2 font-bold text-sm">PRICE</th>
                            <th className="text-right py-2 font-bold text-sm">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="py-4 text-sm">{item.desc}</td>
                                <td className="py-4 text-sm text-right">{item.qty}</td>
                                <td className="py-4 text-sm text-right">${item.rate.toLocaleString()}</td>
                                <td className="py-4 text-sm text-right">${item.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end">
                    <div className="w-1/2 border-t-2 border-black pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-bold">TOTAL</span>
                            <span className="text-xl font-bold">${selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      );
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

      {/* Backdrop for Sheets */}
      {(selectedInvoice || isSheetOpen || isPdfPreviewOpen) && (
        <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => {
                setSelectedInvoice(null);
                setIsSheetOpen(false);
                setIsPdfPreviewOpen(false);
            }}
        />
      )}

      {/* PDF Preview Modal */}
      {isPdfPreviewOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden">
                  {/* Left Sidebar: Controls */}
                  <div className="w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col space-y-8 overflow-y-auto">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center mb-1">
                              <Printer className="w-5 h-5 mr-2 text-emerald-600" />
                              Print & PDF
                          </h3>
                          <p className="text-sm text-slate-500">Customize your invoice layout.</p>
                      </div>

                      <div className="space-y-4">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Template Style</label>
                          <div className="grid grid-cols-1 gap-3">
                              <button 
                                onClick={() => setPdfTemplate('modern')}
                                className={`flex items-center p-3 rounded-lg border transition-all ${pdfTemplate === 'modern' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                              >
                                  <LayoutTemplate className="w-5 h-5 mr-3 text-slate-600" />
                                  <div className="text-left">
                                      <p className="font-semibold text-sm text-slate-800">Modern</p>
                                      <p className="text-xs text-slate-500">Bold & Colorful</p>
                                  </div>
                              </button>
                              <button 
                                onClick={() => setPdfTemplate('classic')}
                                className={`flex items-center p-3 rounded-lg border transition-all ${pdfTemplate === 'classic' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                              >
                                  <FileText className="w-5 h-5 mr-3 text-slate-600" />
                                  <div className="text-left">
                                      <p className="font-semibold text-sm text-slate-800">Classic</p>
                                      <p className="text-xs text-slate-500">Serif & Traditional</p>
                                  </div>
                              </button>
                              <button 
                                onClick={() => setPdfTemplate('minimalist')}
                                className={`flex items-center p-3 rounded-lg border transition-all ${pdfTemplate === 'minimalist' ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                              >
                                  <ScanLine className="w-5 h-5 mr-3 text-slate-600" />
                                  <div className="text-left">
                                      <p className="font-semibold text-sm text-slate-800">Minimalist</p>
                                      <p className="text-xs text-slate-500">Clean & Mono</p>
                                  </div>
                              </button>
                          </div>
                      </div>

                      {pdfTemplate === 'modern' && (
                          <div className="space-y-4">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brand Color</label>
                              <div className="flex flex-wrap gap-3">
                                  {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#1f2937'].map((color) => (
                                      <button 
                                        key={color}
                                        onClick={() => setBrandColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${brandColor === color ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                      />
                                  ))}
                              </div>
                          </div>
                      )}
                      
                      <div className="mt-auto pt-6 border-t border-slate-200 space-y-3">
                          <button 
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/10 flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                              {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                              {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                          </button>
                          <button 
                             onClick={() => setIsPdfPreviewOpen(false)}
                             className="w-full py-2 text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                      </div>
                  </div>

                  {/* Right Panel: Preview Area */}
                  <div className="flex-1 bg-slate-200 overflow-auto p-8 flex justify-center items-start">
                      {/* A4 Paper Aspect Ratio Container (approx 794px width for 96dpi A4) */}
                      <div 
                        ref={invoicePdfRef}
                        className="bg-white shadow-2xl shrink-0 transition-all duration-300 origin-top" 
                        style={{ width: '210mm', minHeight: '297mm' }}
                      >
                          {renderInvoiceContent()}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* New Invoice Sheet */}
      <div className={`fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isSheetOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div>
               <h2 className="text-xl font-bold text-slate-800">New Sales Invoice</h2>
               <p className="text-sm text-slate-500">Create a new invoice for a customer</p>
             </div>
             <button 
               onClick={() => setIsSheetOpen(false)} 
               className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 space-y-6">
               {/* Customer Details */}
               <div className="space-y-4">
                   <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Customer Details</h3>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Customer Name</label>
                           <div className="relative">
                               <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                               <input 
                                   type="text" 
                                   value={newInvoiceData.entity}
                                   onChange={(e) => setNewInvoiceData({...newInvoiceData, entity: e.target.value})}
                                   className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                   placeholder="Acme Corp"
                               />
                           </div>
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Invoice Number</label>
                           <div className="relative">
                               <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                               <input 
                                   type="text" 
                                   value={newInvoiceData.id}
                                   onChange={(e) => setNewInvoiceData({...newInvoiceData, id: e.target.value})}
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
                           <label className="text-xs font-medium text-slate-600">Invoice Date</label>
                           <input 
                               type="date" 
                               value={newInvoiceData.date}
                               onChange={(e) => setNewInvoiceData({...newInvoiceData, date: e.target.value})}
                               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-600"
                           />
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-medium text-slate-600">Due Date</label>
                           <input 
                               type="date" 
                               value={newInvoiceData.dueDate || ''}
                               onChange={(e) => setNewInvoiceData({...newInvoiceData, dueDate: e.target.value})}
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
                               value={newInvoiceData.amount}
                               onChange={(e) => setNewInvoiceData({...newInvoiceData, amount: parseFloat(e.target.value)})}
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
                       onClick={handleSaveInvoice}
                       disabled={!newInvoiceData.entity || !newInvoiceData.amount}
                       className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex justify-center items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       <Check className="w-4 h-4" />
                       <span>Save Invoice</span>
                   </button>
               </div>
           </div>
      </div>

      {/* Invoice Details Sheet */}
      <div className={`fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${selectedInvoice ? 'translate-x-0' : 'translate-x-full'}`}>
           {selectedInvoice && (
            <>
           {/* Detail Header */}
           <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
             <div>
               <div className="flex items-center space-x-2 text-slate-500 mb-1">
                 <FileText className="w-4 h-4" />
                 <span className="text-xs font-semibold uppercase tracking-wider">Invoice Details</span>
               </div>
               <h2 className="text-2xl font-bold text-slate-800">#{selectedInvoice.id}</h2>
             </div>
             <button 
               onClick={() => setSelectedInvoice(null)} 
               className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto p-6 space-y-8">
             
             {/* Key Info Grid */}
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <User className="w-3 h-3" />
                    <span className="text-xs font-medium">Customer</span>
                  </div>
                  <p className="font-semibold text-slate-800">{selectedInvoice.entity}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs font-medium">Due Date</span>
                  </div>
                  <p className="font-semibold text-slate-800">{selectedInvoice.dueDate || 'N/A'}</p>
                </div>
             </div>

             {/* Balance Card */}
             <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg shadow-slate-900/10">
               <div className="flex justify-between items-center mb-4">
                 <span className="text-slate-400 text-sm font-medium">Outstanding Balance</span>
                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                   selectedInvoice.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300' :
                   selectedInvoice.status === 'Overdue' ? 'bg-red-500/20 text-red-300' :
                   'bg-amber-500/20 text-amber-300'
                 }`}>
                   {selectedInvoice.status}
                 </span>
               </div>
               <div className="text-3xl font-bold flex items-center">
                  <span className="text-slate-400 text-lg mr-1">$</span>
                  {calculateBalance(selectedInvoice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
               </div>
               <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between text-sm text-slate-400">
                 <span>Total Invoiced</span>
                 <span>${selectedInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
             </div>

             {/* Payment History */}
             <div>
               <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                 <CreditCard className="w-4 h-4 mr-2 text-emerald-600" />
                 Payment History
               </h3>
               
               <div className="space-y-3">
                 {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                   selectedInvoice.payments.map((payment) => (
                     <div key={payment.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                       <div>
                         <p className="text-sm font-semibold text-slate-800">{payment.method}</p>
                         <p className="text-xs text-slate-500">{payment.date}</p>
                       </div>
                       <span className="font-bold text-emerald-600 text-sm">
                         -${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </span>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                     <p className="text-sm text-slate-400">No payments recorded yet.</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Quick Actions */}
             <div className="space-y-2 pt-4">
                <button 
                  onClick={() => setIsPdfPreviewOpen(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-2 rounded-lg transition-colors flex justify-center items-center"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print / PDF
                </button>
                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm">
                  Record Payment
                </button>
                <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition-colors">
                  Send Reminder
                </button>
             </div>
           </div>
           </>
           )}
      </div>

      {/* Header Toolbar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales Invoices</h2>
          <p className="text-slate-500 text-sm">Manage customer invoices and payments</p>
        </div>
        <div className="flex space-x-3">
            <button 
                onClick={handleScanClick}
                disabled={isScanning}
                className="bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 text-slate-600 px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
            >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <ScanLine className="w-4 h-4" />}
                <span className="font-medium text-sm">{isScanning ? 'Scanning...' : 'AI Auto-Scan'}</span>
            </button>
            <button 
                onClick={() => {
                    setNewInvoiceData({
                        type: 'Invoice',
                        status: 'Pending',
                        date: new Date().toISOString().split('T')[0],
                        amount: 0,
                        entity: '',
                        id: `INV-${Date.now()}`
                    });
                    setIsSheetOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
            >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">New Invoice</span>
            </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex space-x-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by customer or invoice #" 
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent outline-none text-slate-700"
          />
        </div>
        <div className="h-full w-px bg-slate-200 mx-2"></div>
        <button className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-visible h-full">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></th>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedInvoice(t)}
                  className={`group transition-colors cursor-pointer relative ${selectedInvoice?.id === t.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-6 py-4"><input type="checkbox" onClick={(e) => e.stopPropagation()} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="px-6 py-4 font-medium text-slate-700">#{t.id}</td>
                  <td className="px-6 py-4 text-slate-600">{t.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {t.entity.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">{t.entity}</span>
                    </div>
                  </td>
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
                                onClick={(e) => { e.stopPropagation(); setSelectedInvoice(t); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <Eye className="w-4 h-4 mr-2 text-slate-400" /> View Details
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); /* Add Edit Logic Later */ setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit Invoice
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
              {/* Empty state filler for demo */}
              {[1, 2, 3].map(i => (
                <tr key={`empty-${i}`} className="opacity-40 pointer-events-none grayscale">
                   <td className="px-6 py-4"><input type="checkbox" /></td>
                   <td className="px-6 py-4 text-slate-700">#INV-202{i}</td>
                   <td className="px-6 py-4">2023-10-0{i}</td>
                   <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                        <span className="text-slate-700">Historic Client {i}</span>
                      </div>
                   </td>
                   <td className="px-6 py-4"><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">Archived</span></td>
                   <td className="px-6 py-4 text-right">$1,200.00</td>
                   <td className="px-6 py-4"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <span>Showing {invoices.length} of 142 records</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesView;