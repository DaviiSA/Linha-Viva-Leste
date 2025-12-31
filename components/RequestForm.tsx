
import React, { useState, useMemo } from 'react';
import { VTR_LIST } from '../constants';
import { storage } from '../services/storage';
import { MaterialRequest, InventoryItem } from '../types';
import { Plus, Trash2, Send, Search, Truck, User, PackageSearch, Package, AlertCircle } from 'lucide-react';

interface RequestFormProps {
  onBack: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ onBack }) => {
  const [vtr, setVtr] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ materialId: string; materialName: string; quantity: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Search and selection
  const [searchTerm, setSearchTerm] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [selectedForAdding, setSelectedForAdding] = useState<InventoryItem | null>(null);

  // We re-fetch inventory here to ensure we have real-time availability
  const inventory = useMemo(() => storage.getInventory(), []);
  
  const inStockMaterials = useMemo(() => {
    const search = searchTerm.toLowerCase();
    // Show items even if searchTerm is empty but focused
    const filtered = inventory.filter(i => 
      i.quantity > 0 && 
      (search === '' || i.name.toLowerCase().includes(search) || i.code.includes(search))
    );
    return filtered.slice(0, 20); // Show more items for easier browsing
  }, [inventory, searchTerm]);

  const stockError = useMemo(() => {
    if (!selectedForAdding) return null;
    const existingInCart = selectedItems.find(i => i.materialId === selectedForAdding.id)?.quantity || 0;
    const totalToRequest = existingInCart + itemQty;
    if (totalToRequest > selectedForAdding.quantity) {
      return `Saldo insuficiente! Disponível: ${selectedForAdding.quantity - existingInCart}`;
    }
    return null;
  }, [selectedForAdding, itemQty, selectedItems]);

  const addItem = (item: InventoryItem) => {
    if (itemQty <= 0) return;
    
    const existing = selectedItems.find(i => i.materialId === item.id);
    const currentRequestedQty = (existing?.quantity || 0) + itemQty;

    if (currentRequestedQty > item.quantity) {
      alert(`Quantidade em estoque insuficiente! Saldo disponível: ${item.quantity}`);
      return;
    }

    if (existing) {
      setSelectedItems(selectedItems.map(i => 
        i.materialId === item.id ? { ...i, quantity: currentRequestedQty } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { materialId: item.id, materialName: item.name, quantity: itemQty }]);
    }
    setSearchTerm('');
    setItemQty(1);
    setSelectedForAdding(null);
    setIsSearchFocused(false);
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.materialId !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vtr || !requesterName || selectedItems.length === 0) {
      alert('Preencha os dados da VTR/Colaborador e adicione materiais.');
      return;
    }

    setIsSubmitting(true);
    const req: MaterialRequest = {
      id: Date.now().toString(),
      vtr,
      requesterName,
      date: new Date().toISOString(),
      items: selectedItems,
      status: 'Pendente'
    };

    storage.saveRequest(req);
    
    // Simulate cloud sync delay
    setTimeout(() => {
      alert('Sua solicitação foi enviada para o administrador com sucesso!');
      onBack();
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
          <Truck size={120} />
        </div>

        <div className="relative z-10 mb-10">
          <h2 className="text-3xl font-black text-energisa-blue tracking-tight mb-2">Solicitar Material</h2>
          <p className="text-slate-500 text-sm font-medium">Preencha os dados abaixo para retirar itens do estoque.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                <Truck size={14} className="text-energisa-orange" /> Viatura (VTR)
              </label>
              <select 
                required
                className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-energisa-blue focus:bg-white font-bold text-slate-900 transition-all appearance-none cursor-pointer outline-none shadow-sm"
                value={vtr}
                onChange={(e) => setVtr(e.target.value)}
              >
                <option value="">Selecione o prefixo</option>
                {VTR_LIST.map(v => <option key={v} value={v}>VTR {v}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                <User size={14} className="text-energisa-orange" /> Colaborador Responsável
              </label>
              <input 
                required
                type="text" 
                placeholder="Seu nome"
                className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-energisa-blue focus:bg-white font-bold text-slate-900 transition-all placeholder:text-slate-300 placeholder:font-normal outline-none shadow-sm"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full"></div>

          {/* Selector Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                <PackageSearch className="text-energisa-blue" size={20} /> Seleção de Materiais
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                Apenas estoque disponível
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-energisa-blue transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar material..."
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-energisa-blue focus:bg-white outline-none font-bold text-slate-900 transition-all shadow-sm"
                  value={selectedForAdding ? selectedForAdding.name : searchTerm}
                  readOnly={!!selectedForAdding}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={() => selectedForAdding && setSelectedForAdding(null)}
                />
                
                {(isSearchFocused && !selectedForAdding) && (
                  <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-100 shadow-2xl rounded-2xl mt-2 z-[60] max-h-80 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                    <div className="sticky top-0 p-3 bg-slate-50 flex justify-between items-center border-b border-slate-100 z-[61]">
                       <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Estoque Linha Viva</span>
                       <button type="button" onClick={(e) => { e.stopPropagation(); setIsSearchFocused(false); }} className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg uppercase transition-all hover:bg-rose-100">Fechar</button>
                    </div>
                    {inStockMaterials.length > 0 ? (
                      inStockMaterials.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setSelectedForAdding(item); setIsSearchFocused(false); }}
                          className="w-full p-5 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-all group/btn"
                        >
                          <div className="flex-1 truncate mr-4">
                            <span className="block font-bold text-sm text-slate-800 group-hover/btn:text-energisa-blue transition-colors truncate">{item.name}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Código: {item.code}</span>
                          </div>
                          <div className="text-right flex flex-col items-end shrink-0">
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">{item.quantity} no saldo</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <Package size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Sem saldo disponível</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <div className="w-24">
                  <input 
                    type="number" 
                    min="1"
                    className={`w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-energisa-blue focus:bg-white outline-none text-center font-black text-slate-900 transition-all shadow-sm ${stockError ? 'border-rose-300 bg-rose-50' : ''}`}
                    value={itemQty || ''}
                    placeholder="Qtd"
                    onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <button
                  type="button"
                  disabled={!selectedForAdding || !!stockError}
                  onClick={() => selectedForAdding && addItem(selectedForAdding)}
                  className="bg-energisa-blue text-white px-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"
                >
                  Incluir
                </button>
              </div>
            </div>
            
            {stockError && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in shake duration-300">
                <AlertCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-tight">{stockError}</span>
              </div>
            )}
          </div>

          {/* Basket List */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Package className="text-energisa-orange" size={20} /> Carrinho de Solicitação
            </h3>
            {selectedItems.length === 0 ? (
              <div className="py-12 px-6 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Package className="text-slate-300" size={32} />
                </div>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                  Seu carrinho está vazio.<br/>Adicione materiais acima para prosseguir.
                </p>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-300">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-6 bg-white border-2 border-slate-50 rounded-[1.5rem] shadow-sm group hover:border-energisa-blue/20 transition-all">
                    <div className="flex-1 truncate mr-4">
                      <p className="font-black text-slate-800 truncate leading-none mb-1.5">{item.materialName}</p>
                      <p className="text-[10px] font-black text-energisa-blue uppercase tracking-widest bg-blue-50 px-2 py-1 rounded w-fit">Qtd Solicitada: {item.quantity}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeItem(item.materialId)}
                      className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-3 rounded-2xl transition-all active:scale-90"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="w-full bg-energisa-orange text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:shadow-energisa-orange/40 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Processando...
                </span>
              ) : (
                <><Send size={24} /> Confirmar Solicitação</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;
