
import { InventoryItem, MaterialRequest, StockTransaction } from '../types';
import { MATERIALS } from '../constants';

const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbygxD9-cbkB3mj7gxAwfYfF8VGMFSNcB10_VYcBz5n04nopu5dAoTdZfT0WUSVRMGaR/exec"; 

const KEYS = {
  INVENTORY: 'lv_inventory',
  REQUESTS: 'lv_requests',
  TRANSACTIONS: 'lv_transactions'
};

export const storage = {
  // Busca o inventário da nuvem (Google Sheets)
  fetchInventoryFromCloud: async (): Promise<InventoryItem[] | null> => {
    try {
      const response = await fetch(GOOGLE_SHEET_WEBAPP_URL);
      const cloudData = await response.json();
      
      // Mapeia os dados da planilha para o formato do App
      const syncedInventory = MATERIALS.map(m => {
        const cloudItem = cloudData.find((c: any) => c.Código == m.code || c.Código == m.id);
        return {
          ...m,
          quantity: cloudItem ? Number(cloudItem['Saldo Atual'] || cloudItem.Saldo || 0) : 0
        };
      });

      storage.saveInventory(syncedInventory);
      return syncedInventory;
    } catch (error) {
      console.error("Erro ao baixar dados da nuvem:", error);
      return null;
    }
  },

  getInventory: (): InventoryItem[] => {
    const data = localStorage.getItem(KEYS.INVENTORY);
    if (!data) {
      return MATERIALS.map(m => ({ ...m, quantity: 0 }));
    }
    return JSON.parse(data);
  },

  saveInventory: (items: InventoryItem[]) => {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
  },

  getRequests: (): MaterialRequest[] => {
    const data = localStorage.getItem(KEYS.REQUESTS);
    return data ? JSON.parse(data) : [];
  },

  saveRequest: async (req: MaterialRequest) => {
    const current = storage.getRequests();
    const updated = [req, ...current];
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updated));
    
    const rows = [
      new Date().toLocaleString('pt-BR'),
      req.vtr,
      req.requesterName,
      req.items.map(i => `${i.materialName} (x${i.quantity})`).join(', '),
      req.status
    ];
    
    await storage.syncToCloud('Solicitacoes', rows);
  },

  updateRequestStatus: (id: string, status: MaterialRequest['status']): boolean => {
    const currentRequests = storage.getRequests();
    const requestIndex = currentRequests.findIndex(r => r.id === id);
    
    if (requestIndex === -1) return false;
    const request = currentRequests[requestIndex];

    if (status === 'Atendido' && request.status !== 'Atendido') {
      const inventory = storage.getInventory();
      for (const item of request.items) {
        const invItem = inventory.find(i => i.id === item.materialId);
        if (!invItem || invItem.quantity < item.quantity) return false;
      }

      request.items.forEach(item => {
        storage.saveTransaction({
          id: `req-out-${id}-${item.materialId}`,
          materialId: item.materialId,
          type: 'saida',
          quantity: item.quantity,
          date: new Date().toISOString(),
          reason: `Atendimento VTR ${request.vtr}`
        });
      });
    }

    const updatedRequests = currentRequests.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updatedRequests));
    return true;
  },

  getTransactions: (): StockTransaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: async (tx: StockTransaction) => {
    const current = storage.getTransactions();
    const updated = [tx, ...current];
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
    
    const inventory = storage.getInventory();
    const itemIdx = inventory.findIndex(i => i.id === tx.materialId);
    if (itemIdx > -1) {
      if (tx.type === 'entrada') {
        inventory[itemIdx].quantity += tx.quantity;
      } else {
        inventory[itemIdx].quantity = Math.max(0, inventory[itemIdx].quantity - tx.quantity);
      }
      storage.saveInventory(inventory);
      
      const rows = [
        new Date(tx.date).toLocaleString('pt-BR'),
        inventory[itemIdx].code,
        inventory[itemIdx].name,
        tx.type.toUpperCase(),
        tx.quantity,
        tx.reason,
        inventory[itemIdx].quantity 
      ];
      await storage.syncToCloud('Transacoes', rows);
    }
  },

  syncToCloud: async (sheetName: string, rows: any[]) => {
    if (!GOOGLE_SHEET_WEBAPP_URL) return;
    try {
      await fetch(GOOGLE_SHEET_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors', 
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'append',
          sheet: sheetName,
          rows: rows
        })
      });
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    }
  }
};
