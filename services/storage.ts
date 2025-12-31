
import { InventoryItem, MaterialRequest, StockTransaction } from '../types';
import { MATERIALS } from '../constants';

const KEYS = {
  INVENTORY: 'lv_inventory',
  REQUESTS: 'lv_requests',
  TRANSACTIONS: 'lv_transactions'
};

export const storage = {
  getInventory: (): InventoryItem[] => {
    const data = localStorage.getItem(KEYS.INVENTORY);
    if (!data) {
      return MATERIALS.map(m => ({ ...m, quantity: 0 }));
    }
    return JSON.parse(data);
  },

  saveInventory: (items: InventoryItem[]) => {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    storage.syncToCloud('inventory', items);
  },

  getRequests: (): MaterialRequest[] => {
    const data = localStorage.getItem(KEYS.REQUESTS);
    return data ? JSON.parse(data) : [];
  },

  saveRequest: (req: MaterialRequest) => {
    const current = storage.getRequests();
    const updated = [req, ...current];
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updated));
    storage.syncToCloud('request', req);
  },

  updateRequestStatus: (id: string, status: MaterialRequest['status']): boolean => {
    const currentRequests = storage.getRequests();
    const requestIndex = currentRequests.findIndex(r => r.id === id);
    
    if (requestIndex === -1) return false;
    const request = currentRequests[requestIndex];

    // Se estiver mudando para Atendido, debita do estoque
    if (status === 'Atendido' && request.status !== 'Atendido') {
      const inventory = storage.getInventory();
      
      // Validação de segurança: verificar se todos os itens ainda têm saldo
      for (const item of request.items) {
        const invItem = inventory.find(i => i.id === item.materialId);
        if (!invItem || invItem.quantity < item.quantity) {
          return false; // Falha se não houver saldo suficiente
        }
      }

      // Processa as saídas
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

    // Atualiza o status
    const updatedRequests = currentRequests.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updatedRequests));
    return true;
  },

  getTransactions: (): StockTransaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: (tx: StockTransaction) => {
    const current = storage.getTransactions();
    const updated = [tx, ...current];
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
    
    // Atualiza saldo no inventário
    const inventory = storage.getInventory();
    const itemIdx = inventory.findIndex(i => i.id === tx.materialId);
    if (itemIdx > -1) {
      if (tx.type === 'entrada') {
        inventory[itemIdx].quantity += tx.quantity;
      } else {
        inventory[itemIdx].quantity = Math.max(0, inventory[itemIdx].quantity - tx.quantity);
      }
      storage.saveInventory(inventory);
    }
  },

  syncToCloud: async (type: string, data: any) => {
    console.log(`Syncing ${type} to Google Sheets...`, data);
  }
};
