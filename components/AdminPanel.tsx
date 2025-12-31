
import React, { useState, useEffect } from 'react';
import { Package, CheckSquare, List, Plus, Minus, Search, FileDown, ShieldAlert, CheckCircle2, XCircle, CloudSync, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';
import { InventoryItem, MaterialRequest, StockTransaction } from '../types';

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'estoque' | 'solicitacoes'>('estoque');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateQty, setUpdateQty] = useState<number>(0);
  const [updateReason, setUpdateReason] = useState('Entrada de Estoque');

  const loadData = async (forceCloud = false) => {
    if (forceCloud) {
      setIsRefreshing(true);
      await storage.fetchInventoryFromCloud();
      setIsRefreshing(false);
    }
    setInventory(storage.getInventory());
    setRequests(storage.getRequests());
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Dsa21') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleUpdateStock = async (type: 'entrada' | 'saida') => {
    if (!selectedItem || updateQty <= 0) return;
    if (type === 'saida' && selectedItem.quantity < updateQty) {
      alert('Estoque insuficiente para essa saída!');
      return;
    }

    const tx: StockTransaction = {
      id: Date.now().toString(),
      materialId: selectedItem.id,
      type,
      quantity: updateQty,
      date: new Date().toISOString(),
      reason: updateReason
    };

    await storage.saveTransaction(tx);
    loadData();
    setSelectedItem(null);
    setUpdateQty(0);
    setUpdateReason('Entrada de Estoque');
  };

  const handleRequestStatus = async (id: string, status: MaterialRequest['status']) => {
    const success = storage.updateRequestStatus(id, status);
    if (!success && status === 'Atendido') {
      alert('Erro: Saldo insuficiente em estoque!');
    }
    loadData();
  };

  const exportToExcel = () => {
    if (typeof (window as any).XLSX === 'undefined') {
      alert('Biblioteca Excel não carregada.');
      return;
    }
    const XLSX = (window as any).XLSX;
    const data = inventory.map(item => ({
      'Código': item.code,
      'Descrição Material': item.name,
      'Saldo Atual': item.quantity
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque Atual");
    XLSX.writeFile(wb, `Estoque_LinhaViva_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in duration-300">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full">
          <div className="bg-energisa-blue/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="text-energisa-blue" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-800">Administração</h2>
          <p className="text-slate-500 text-center text-sm mb-8">Digite a senha para gerenciar o estoque.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha Restrita</label>
              <input
                type="password"
                placeholder="Senha de acesso"
                className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-energisa-blue focus:bg-white bg-slate-50 transition-all text-center text-lg font-black text-slate-900 outline-none shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button className="w-full bg-energisa-blue text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:bg-blue-800 transition-all active:scale-95 shadow-lg">
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('estoque')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'estoque' ? 'bg-white shadow-sm text-energisa-blue' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={18} /> Estoque
          </button>
          <button
            onClick={() => setActiveTab('solicitacoes')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'solicitacoes' ? 'bg-white shadow-sm text-energisa-blue' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CheckSquare size={18} /> Pedidos
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
           <button 
             onClick={() => loadData(true)}
             disabled={isRefreshing}
             className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
           >
             <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> 
             {isRefreshing ? 'Sincronizando...' : 'Sincronizar Nuvem'}
           </button>
          {activeTab === 'estoque' && (
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex-1 sm:flex-none justify-center"
            >
              <FileDown size={18} /> Excel
            </button>
          )}
        </div>
      </div>

      {activeTab === 'estoque' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Filtrar materiais..." 
                className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 rounded-2xl text-sm focus:border-energisa-blue focus:bg-white bg-white transition-all text-slate-900 font-semibold outline-none shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Material / Descrição</th>
                  <th className="px-6 py-4 text-center">Saldo</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map(item => (
                  <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">{item.code}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{item.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[40px] px-3 py-1 rounded-full text-sm font-bold ${item.quantity > 5 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedItem(item)}
                        className="bg-white border-2 border-slate-100 text-energisa-blue hover:border-energisa-blue hover:bg-energisa-blue hover:text-white p-2.5 rounded-xl transition-all shadow-sm active:scale-90"
                      >
                        <Plus size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg hover:shadow-2xl transition-all space-y-4 group">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-energisa-orange animate-pulse"></div>
                    <h4 className="font-black text-xl text-slate-800">VTR {req.vtr}</h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {req.requesterName} &bull; {new Date(req.date).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  req.status === 'Atendido' ? 'bg-emerald-100 text-emerald-700' : 
                  req.status === 'Não Atendido' ? 'bg-rose-100 text-rose-700' : 
                  'bg-amber-100 text-amber-700'
                }`}>
                  {req.status}
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <ul className="space-y-2">
                  {req.items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate mr-2">{item.materialName}</span>
                      <span className="font-black text-slate-800">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {req.status === 'Pendente' && (
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => handleRequestStatus(req.id, 'Atendido')}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Atender
                  </button>
                  <button 
                    onClick={() => handleRequestStatus(req.id, 'Não Atendido')}
                    className="flex-1 border-2 border-slate-200 text-slate-500 py-3 rounded-2xl text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Negar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl border border-white animate-in zoom-in duration-300">
            <div className="flex justify-between items-start">
              <div className="bg-energisa-blue/10 p-3 rounded-2xl">
                <Package className="text-energisa-blue" size={24} />
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-300 hover:text-slate-500 transition-colors">
                <XCircle size={32} />
              </button>
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">Movimentar Estoque</h3>
              <p className="text-sm text-slate-500 font-medium leading-tight">{selectedItem.name}</p>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cód. Interno</p>
                  <p className="font-mono text-sm font-bold text-slate-600">{selectedItem.code}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
                  <p className="font-bold text-lg text-energisa-blue">{selectedItem.quantity}</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quantidade</label>
                <input 
                  type="number" 
                  className="w-full p-5 border-2 border-slate-100 rounded-3xl bg-slate-50 focus:border-energisa-blue focus:bg-white text-xl font-black text-slate-900 outline-none"
                  value={updateQty || ''}
                  onChange={(e) => setUpdateQty(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Observação</label>
                <input 
                  type="text" 
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-energisa-blue focus:bg-white text-slate-900 font-semibold outline-none"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => handleUpdateStock('saida')} className="flex-1 bg-rose-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg active:scale-95 flex items-center justify-center gap-2">
                  <Minus size={18} /> Saída
                </button>
                <button onClick={() => handleUpdateStock('entrada')} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg active:scale-95 flex items-center justify-center gap-2">
                  <Plus size={18} /> Entrada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
