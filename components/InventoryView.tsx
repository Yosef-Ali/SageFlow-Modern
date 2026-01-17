import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem } from '../types';
import { Search, Filter, Plus, Package, AlertTriangle, MoreHorizontal, Check, X, History, Edit, DollarSign, RefreshCw, Camera, Save, ArrowRight, MinusCircle, PlusCircle, Trash2, Move, ZoomIn, ZoomOut, Crop } from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onUpdateItem?: (item: InventoryItem) => void;
  onAddItem?: (item: InventoryItem) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ inventory, onUpdateItem, onAddItem }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sheet & Action State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'view' | 'edit' | 'adjust' | 'create'>('view');

  // Form States
  const [editForm, setEditForm] = useState<Partial<InventoryItem> | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  // Cropper State
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (!isSheetOpen) {
          setSelectedItem(null);
          setOpenMenuId(null);
          // Reset forms when sheet closes
          setEditForm(null);
          setAdjustmentQty('');
          setCropImage(null);
      }
  }, [isSheetOpen]);

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const openSheet = (item: InventoryItem | null, mode: 'view' | 'edit' | 'adjust' | 'create') => {
      setSelectedItem(item);
      setSheetMode(mode);
      
      if (mode === 'create') {
          setEditForm({
              name: '',
              sku: '',
              category: 'General',
              quantityOnHand: 0,
              reorderPoint: 0,
              costPrice: 0,
              sellingPrice: 0,
              unit: 'pcs',
              id: `ITM-${Date.now()}`
          });
      } else if (item) {
          setEditForm(JSON.parse(JSON.stringify(item)));
          setAdjustmentQty('');
          setAdjustmentType('add');
      }
      
      setIsSheetOpen(true);
      setOpenMenuId(null);
  };

  // Derived Data
  const categories = Array.from(new Set(inventory.map(i => i.category)));
  
  const filteredInventory = inventory.filter(item => {
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockItems = inventory.filter(i => i.quantityOnHand <= i.reorderPoint);
  const totalValue = inventory.reduce((acc, curr) => acc + (curr.quantityOnHand * curr.costPrice), 0);

  // --- Image Handling & Cropping ---

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCropImage(reader.result as string);
            setCropScale(1);
            setCropOffset({ x: 0, y: 0 });
        };
        reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (event.target) event.target.value = '';
  };

  const handleCropSave = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 300; // Standardized size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx && editForm) {
        // Visual viewport size is 250px
        const viewportSize = 250; 
        
        // Map visual transform to canvas
        const ratio = size / viewportSize;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.scale(ratio, ratio);
        ctx.translate(cropOffset.x + viewportSize/2, cropOffset.y + viewportSize/2);
        ctx.scale(cropScale, cropScale);
        ctx.translate(-imgRef.current.width / 2, -imgRef.current.height / 2);
        
        ctx.drawImage(imgRef.current, 0, 0);
        ctx.restore();
        
        const result = canvas.toDataURL('image/jpeg', 0.85); // Compress slightly
        
        const updated = { ...editForm, image: result };
        setEditForm(updated);
        
        // If live editing (not create mode), update immediately
        if (sheetMode !== 'create' && onUpdateItem) {
            onUpdateItem(updated as InventoryItem);
            setSelectedItem(updated as InventoryItem);
        }
        setCropImage(null);
    }
  };

  // Drag Logic for Cropper
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
        setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getPlaceholderColor = (name: string = '') => {
    const colors = [
        'bg-red-100 text-red-600 border-red-200',
        'bg-orange-100 text-orange-600 border-orange-200',
        'bg-amber-100 text-amber-600 border-amber-200',
        'bg-emerald-100 text-emerald-600 border-emerald-200',
        'bg-cyan-100 text-cyan-600 border-cyan-200',
        'bg-blue-100 text-blue-600 border-blue-200',
        'bg-violet-100 text-violet-600 border-violet-200',
        'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
        'bg-slate-100 text-slate-600 border-slate-200',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderItemImage = (item: InventoryItem | Partial<InventoryItem> | null, sizeClass: string = "w-10 h-10") => {
      // Safe guard for null item
      if (!item) return <div className={`${sizeClass} bg-slate-100 rounded-lg`}></div>;

      if (item.image) {
          return (
              <img src={item.image} alt={item.name} className={`${sizeClass} object-cover rounded-lg border border-slate-200 bg-white`} />
          );
      }
      
      const colorClass = getPlaceholderColor(item.name || 'Item');
      const initials = (item.name || '?').substring(0, 2).toUpperCase();
      
      return (
          <div className={`${sizeClass} ${colorClass} rounded-lg flex items-center justify-center font-bold border shadow-sm select-none`}>
              <span className={sizeClass.includes('20') ? 'text-2xl' : 'text-xs'}>{initials}</span>
          </div>
      );
  };

  const handleSave = () => {
    if (editForm && editForm.name && editForm.sku) {
      if (sheetMode === 'create' && onAddItem) {
          onAddItem(editForm as InventoryItem);
      } else if (onUpdateItem && selectedItem) {
          onUpdateItem(editForm as InventoryItem);
          setSelectedItem(editForm as InventoryItem);
      }
      setIsSheetOpen(false);
    }
  };

  const handleConfirmAdjustment = () => {
    if (selectedItem && onUpdateItem && adjustmentQty) {
      const qty = parseInt(adjustmentQty);
      if (!isNaN(qty) && qty > 0) {
        const newQuantity = adjustmentType === 'add'
          ? selectedItem.quantityOnHand + qty
          : Math.max(0, selectedItem.quantityOnHand - qty);
        
        const updatedItem = { ...selectedItem, quantityOnHand: newQuantity };
        onUpdateItem(updatedItem);
        setSelectedItem(updatedItem);
        setSheetMode('view');
        setAdjustmentQty('');
      }
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300 relative" onClick={() => setOpenMenuId(null)}>
      
      {/* Cropper Modal */}
      {cropImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Crop className="w-4 h-4 mr-2 text-emerald-600" />
                        Adjust Image
                    </h3>
                    <button onClick={() => setCropImage(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col items-center bg-slate-50">
                    <div 
                        className="w-[250px] h-[250px] rounded-lg border-2 border-emerald-500 overflow-hidden relative bg-white shadow-inner cursor-move mb-6 touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img 
                            ref={imgRef}
                            src={cropImage} 
                            alt="Crop Preview" 
                            className="absolute max-w-none origin-center pointer-events-none"
                            style={{
                                transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                                left: '50%',
                                top: '50%'
                            }}
                            draggable={false}
                        />
                        {/* Guide Grid */}
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                            <div className="w-full h-1/3 border-b border-white/50 absolute top-0"></div>
                            <div className="w-full h-1/3 border-b border-white/50 absolute top-1/3"></div>
                            <div className="h-full w-1/3 border-r border-white/50 absolute left-0"></div>
                            <div className="h-full w-1/3 border-r border-white/50 absolute left-1/3"></div>
                        </div>
                    </div>

                    <div className="w-full max-w-[250px] space-y-2">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span className="flex items-center"><ZoomOut className="w-3 h-3 mr-1" /> Zoom</span>
                            <span className="flex items-center">Move to adjust <Move className="w-3 h-3 ml-1" /></span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="3" 
                            step="0.05"
                            value={cropScale}
                            onChange={(e) => setCropScale(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex space-x-3">
                    <button 
                        onClick={() => setCropImage(null)}
                        className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleCropSave}
                        className="flex-1 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex justify-center items-center"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Apply
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Side Sheet */}
      <div className={`fixed inset-y-0 right-0 w-[550px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-slate-200 ${isSheetOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Backdrop for Sheet */}
        {isSheetOpen && (
             <div 
                 className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[-1] transition-opacity" 
                 onClick={() => setIsSheetOpen(false)}
             />
        )}

        {/* Sheet Header */}
        <div className="p-6 border-b border-slate-100 flex items-start space-x-4 bg-slate-50/50">
             <div 
                className="relative flex-shrink-0 w-20 h-20 flex items-center justify-center group cursor-pointer" 
                onClick={() => (sheetMode === 'edit' || sheetMode === 'create') && fileInputRef.current?.click()}
            >
                {renderItemImage(sheetMode === 'create' || sheetMode === 'edit' ? editForm : selectedItem, "w-20 h-20")}
                
                {(sheetMode === 'edit' || sheetMode === 'create') && (
                    <>
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                        />
                    </>
                )}
            </div>

            <div className="flex-1">
                 {sheetMode === 'edit' || sheetMode === 'create' ? (
                     <div className="space-y-2">
                         <input 
                             type="text" 
                             value={editForm?.name || ''} 
                             onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                             className="text-xl font-bold text-slate-800 border-b border-slate-300 focus:border-emerald-500 outline-none bg-transparent w-full placeholder-slate-400"
                             placeholder="Item Name"
                         />
                         <div className="flex items-center space-x-2">
                            <input 
                             type="text" 
                             value={editForm?.sku || ''} 
                             onChange={(e) => setEditForm({...editForm, sku: e.target.value})}
                             className="text-xs font-mono text-slate-500 border-b border-slate-300 focus:border-emerald-500 outline-none bg-transparent w-32 placeholder-SKU"
                             placeholder="SKU"
                           />
                           <select 
                             value={editForm?.category || 'General'}
                             onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                             className="text-xs font-medium bg-slate-100 border-none rounded-full px-2 py-0.5 text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                           >
                               <option value="General">General</option>
                               {categories.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                           <input 
                             type="text" 
                             value={editForm?.unit || ''} 
                             onChange={(e) => setEditForm({...editForm, unit: e.target.value})}
                             className="text-xs font-medium text-slate-600 border-b border-slate-300 focus:border-emerald-500 outline-none bg-transparent w-16"
                             placeholder="Unit"
                           />
                         </div>
                     </div>
                 ) : (
                     <>
                        <div className="flex items-center space-x-2 mb-1">
                             <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{selectedItem?.category}</span>
                             <span className="text-slate-400 text-xs font-mono">#{selectedItem?.sku}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">{selectedItem?.name}</h2>
                     </>
                 )}
            </div>
            
            <button onClick={() => setIsSheetOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6">
             {sheetMode === 'adjust' ? (
                 <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <RefreshCw className="w-5 h-5 mr-2 text-emerald-600" />
                        Adjust Stock Level
                     </h3>
                     <div className="flex items-center justify-center space-x-8 mb-8">
                        <div className="text-center">
                            <p className="text-sm text-slate-500 mb-1">Current</p>
                            <p className="text-3xl font-bold text-slate-700">
                                {selectedItem?.quantityOnHand} <span className="text-sm text-slate-400 font-medium">{selectedItem?.unit}</span>
                            </p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-slate-300" />
                        <div className="text-center">
                            <p className="text-sm text-emerald-600 font-medium mb-1">New Level</p>
                            <p className="text-3xl font-bold text-emerald-600">
                                {adjustmentType === 'add' 
                                    ? (selectedItem?.quantityOnHand || 0) + (parseInt(adjustmentQty) || 0)
                                    : Math.max(0, (selectedItem?.quantityOnHand || 0) - (parseInt(adjustmentQty) || 0))
                                } <span className="text-sm text-emerald-600/70 font-medium">{selectedItem?.unit}</span>
                            </p>
                        </div>
                     </div>

                     <div className="max-w-xs mx-auto space-y-4">
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                            <button 
                                onClick={() => setAdjustmentType('add')}
                                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-colors ${adjustmentType === 'add' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>Add</span>
                            </button>
                            <button 
                                onClick={() => setAdjustmentType('remove')}
                                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-colors ${adjustmentType === 'remove' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <MinusCircle className="w-4 h-4" />
                                <span>Remove</span>
                            </button>
                        </div>
                        
                        <div className="relative">
                            <input 
                                type="number" 
                                min="1"
                                value={adjustmentQty}
                                onChange={(e) => setAdjustmentQty(e.target.value)}
                                className="w-full text-center text-lg font-bold p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                placeholder="0"
                                autoFocus
                            />
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                                {selectedItem?.unit}
                            </div>
                        </div>
                     </div>
                 </div>
             ) : (
                <div className="space-y-8">
                     {/* Stats Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {sheetMode === 'create' ? (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <p className="text-xs text-slate-500 font-semibold uppercase">Initial Stock</p>
                                <input 
                                    type="number"
                                    value={editForm?.quantityOnHand}
                                    onChange={(e) => setEditForm({...editForm, quantityOnHand: parseFloat(e.target.value)})} 
                                    className="w-full bg-transparent border-b border-slate-300 text-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 mt-1"
                                />
                            </div>
                         ) : (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs text-emerald-600 font-semibold uppercase">Quantity On Hand</p>
                                <div className="mt-1 flex items-baseline space-x-1">
                                    <span className="text-2xl font-bold text-emerald-900">{selectedItem?.quantityOnHand}</span>
                                    <span className="text-sm text-emerald-700 font-medium">{editForm?.unit || selectedItem?.unit}</span>
                                </div>
                            </div>
                         )}

                         <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-600 font-semibold uppercase">Selling Price</p>
                            <div className="mt-1 flex items-baseline space-x-1">
                                {(sheetMode === 'edit' || sheetMode === 'create') ? (
                                    <div className="flex items-center">
                                        <span className="text-blue-900 font-bold text-lg mr-1">$</span>
                                        <input 
                                            type="number" 
                                            value={editForm?.sellingPrice}
                                            onChange={(e) => setEditForm({...editForm, sellingPrice: parseFloat(e.target.value)})}
                                            className="w-24 bg-white/50 border-b border-blue-300 text-xl font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-2xl font-bold text-blue-900">${selectedItem?.sellingPrice.toLocaleString()}</span>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-xs text-amber-600 font-semibold uppercase">Reorder Point</p>
                            <div className="mt-1 flex items-baseline space-x-1">
                                {(sheetMode === 'edit' || sheetMode === 'create') ? (
                                    <input 
                                        type="number" 
                                        value={editForm?.reorderPoint}
                                        onChange={(e) => setEditForm({...editForm, reorderPoint: parseFloat(e.target.value)})}
                                        className="w-24 bg-white/50 border-b border-amber-300 text-xl font-bold text-amber-900 focus:outline-none focus:border-amber-600"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-amber-900">{selectedItem?.reorderPoint}</span>
                                )}
                                <span className="text-sm text-amber-700 font-medium">{editForm?.unit || selectedItem?.unit}</span>
                            </div>
                        </div>
                     </div>

                     {/* Details Form */}
                     <div className="grid grid-cols-2 gap-8">
                         <div>
                            <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                <DollarSign className="w-4 h-4 mr-2 text-slate-400" />
                                Financials
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                    <span className="text-slate-500">Cost Price</span>
                                    {(sheetMode === 'edit' || sheetMode === 'create') ? (
                                        <div className="flex items-center">
                                                <span className="text-slate-600 mr-1">$</span>
                                                <input 
                                                type="number" 
                                                value={editForm?.costPrice}
                                                onChange={(e) => setEditForm({...editForm, costPrice: parseFloat(e.target.value)})}
                                                className="w-20 text-right font-medium text-slate-700 border-b border-slate-300 focus:border-emerald-500 outline-none"
                                                />
                                        </div>
                                    ) : (
                                        <span className="font-medium text-slate-700">${selectedItem?.costPrice.toFixed(2)}</span>
                                    )}
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                    <span className="text-slate-500">Margin</span>
                                    <span className="font-medium text-emerald-600">
                                        {selectedItem && selectedItem.sellingPrice > 0 ? (((selectedItem.sellingPrice - selectedItem.costPrice) / selectedItem.sellingPrice) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                         </div>
                         
                         {sheetMode === 'view' && (
                             <div>
                                <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                                    <History className="w-4 h-4 mr-2 text-slate-400" />
                                    Recent Activity
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <span className="text-slate-600">Stock Adjustment</span>
                                        </div>
                                        <span className="text-slate-400 text-xs">2 days ago</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            <span className="text-slate-600">Price Update</span>
                                        </div>
                                        <span className="text-slate-400 text-xs">5 days ago</span>
                                    </div>
                                </div>
                             </div>
                         )}
                     </div>
                </div>
             )}
        </div>

        {/* Sheet Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
             {sheetMode === 'adjust' ? (
                 <>
                    <button 
                        onClick={() => setSheetMode('view')}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmAdjustment}
                        disabled={!adjustmentQty}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="w-4 h-4" />
                        <span>Confirm Adjustment</span>
                    </button>
                 </>
             ) : (sheetMode === 'edit' || sheetMode === 'create') ? (
                 <>
                     <button 
                        onClick={() => sheetMode === 'create' ? setIsSheetOpen(false) : setSheetMode('view')}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                     >
                        <Save className="w-4 h-4" />
                        <span>{sheetMode === 'create' ? 'Create Item' : 'Save Changes'}</span>
                     </button>
                 </>
             ) : (
                 <>
                     <button 
                        onClick={() => openSheet(selectedItem, 'edit')}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center space-x-2"
                     >
                        <Edit className="w-4 h-4" />
                        <span>Edit Item</span>
                     </button>
                     <button 
                        onClick={() => openSheet(selectedItem, 'adjust')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                     >
                        <RefreshCw className="w-4 h-4" />
                        <span>Adjust Stock</span>
                     </button>
                 </>
             )}
        </div>
      </div>


      {/* Header Toolbar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500 text-sm">Track stock levels, adjustments, and valuation</p>
        </div>
        <div className="flex space-x-2">
            <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Adjust Stock
            </button>
            <button 
                onClick={() => openSheet(null, 'create')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
            >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">New Item</span>
            </button>
        </div>
      </div>

       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-semibold uppercase">Total Inventory Value</p>
             <h3 className="text-xl font-bold text-slate-800 mt-1">${totalValue.toLocaleString()}</h3>
           </div>
           <div className="p-2 bg-indigo-50 rounded-lg">
             <Package className="w-5 h-5 text-indigo-500" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-semibold uppercase">Low Stock Alerts</p>
             <h3 className="text-xl font-bold text-amber-600 mt-1">{lowStockItems.length} Items</h3>
           </div>
           <div className="p-2 bg-amber-50 rounded-lg">
             <AlertTriangle className="w-5 h-5 text-amber-500" />
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-semibold uppercase">Total SKUs</p>
             <h3 className="text-xl font-bold text-slate-800 mt-1">{inventory.length}</h3>
           </div>
           <div className="p-2 bg-slate-100 rounded-lg">
             <Package className="w-5 h-5 text-slate-500" />
           </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex space-x-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm relative z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU, name or category..." 
            className="w-full pl-10 pr-4 py-2 text-sm bg-transparent outline-none text-slate-700"
          />
        </div>
        <div className="h-full w-px bg-slate-200 mx-2"></div>
        
        <div className="relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
              selectedCategory || isFilterOpen 
                ? 'bg-emerald-50 text-emerald-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>{selectedCategory || 'Category'}</span>
            {selectedCategory && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory(null);
                }}
                className="ml-1 p-0.5 hover:bg-emerald-200 rounded-full"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {isFilterOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsFilterOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Filter by Category
                </div>
                <button
                   onClick={() => {
                     setSelectedCategory(null);
                     setIsFilterOpen(false);
                   }}
                   className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${!selectedCategory ? 'text-emerald-600 font-medium' : 'text-slate-700'}`}
                >
                  <span>All Categories</span>
                  {!selectedCategory && <Check className="w-4 h-4" />}
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${selectedCategory === category ? 'text-emerald-600 font-medium' : 'text-slate-700'}`}
                  >
                    <span>{category}</span>
                    {selectedCategory === category && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-visible h-full">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></th>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Stock Level</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => {
                  const isLowStock = item.quantityOnHand <= item.reorderPoint;
                  return (
                <tr 
                  key={item.id} 
                  onClick={() => openSheet(item, 'view')}
                  className="hover:bg-slate-50 group transition-colors cursor-pointer relative"
                >
                  <td className="px-6 py-4"><input type="checkbox" onClick={(e) => e.stopPropagation()} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                        {renderItemImage(item)}
                        <div>
                            <p className="text-slate-900 font-medium">{item.name}</p>
                            <p className="text-xs text-slate-500 font-mono">SKU: {item.sku}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          {item.category}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                        <span className={`font-bold ${isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>
                            {item.quantityOnHand} {item.unit}
                        </span>
                        {isLowStock && (
                             <span className="text-[10px] text-amber-600 flex items-center mt-0.5">
                                 <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                             </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    ${item.costPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">
                    ${item.sellingPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                        onClick={(e) => toggleMenu(item.id, e)}
                        className={`p-1 rounded transition-colors ${openMenuId === item.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openMenuId === item.id && (
                        <div className="absolute right-8 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openSheet(item, 'view'); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <Package className="w-4 h-4 mr-2 text-slate-400" /> View Details
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); openSheet(item, 'edit'); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit Item
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); openSheet(item, 'adjust'); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                            >
                                <RefreshCw className="w-4 h-4 mr-2 text-slate-400" /> Adjust Stock
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
              )})}
              {filteredInventory.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        {searchQuery || selectedCategory ? 'No items match your filters.' : 'No inventory items found.'}
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

export default InventoryView;