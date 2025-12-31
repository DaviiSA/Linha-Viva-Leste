
import { InventoryItem, MaterialRequest, StockTransaction } from '../types';
import { MATERIALS } from '../constants';

// URL final do WebApp do Google Apps Script
const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbx1KDBQfG3AMzaQ0jqCnUPmj_0vMTyGemyYptEAyZPBOSdxGlU9qQWc8rKTqzdmrnyN/exec"; 

const KEYS = {
  INVENTORY: 'lv_inventory',
  REQUESTS: 'lv_requests',
  TRANSACTIONS: 'lv_transactions'
};

export const storage = {
  /**
   * Busca o saldo de estoque atualizado diretamente da Planilha do Google (aba 'Estoque').
   * Isso permite que múltiplos aparelhos vejam o mesmo saldo em tempo real.
   */
  fetchInventoryFromCloud: async (): Promise<InventoryItem[] | null> => {
    try {
      // O Google Apps Script permite GET para leitura de dados
      const response = await fetch(GOOGLE_SHEET_WEBAPP_URL);
      if (!response.ok) throw new Error('Falha na resposta da rede');
      
      const cloudData = await response.json();
      
      // Mapeia os dados da planilha para o formato do App, garantindo que todos os materiais existam
      const syncedInventory = MATERIALS.map(m => {
        // Busca na planilha pelo código ou ID
        const cloudItem = cloudData.find((c: any) => 
          String(c.Código).trim() === String(m.code).trim() || 
          String(c.id).trim() === String(m.id).trim()
        );
        
        return {
          ...m,
          quantity: cloudItem ? Number(cloudItem['Saldo Atual'] || cloudItem.Saldo || 0) : 0
        };
      });

      // Salva localmente para persistência offline rápida
      storage.saveInventory(syncedInventory);
      return syncedInventory;
    } catch (error) {
      console.error("Erro crítico ao sincronizar com a nuvem:", error);
      // Se falhar, retorna o que tem no localStorage para não travar o app
      return storage.getInventory();
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
    
    // Registra a solicitação na aba 'Solicitacoes' da planilha
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

    // Se o pedido for atendido, gera as transações de saída de estoque
    if (status === 'Atendido' && request.status !== 'Atendido') {
      const inventory = storage.getInventory();
      
      // Verifica disponibilidade de todos os itens antes de processar
      for (const item of request.items) {
        const invItem = inventory.find(i => i.id === item.materialId);
        if (!invItem || invItem.quantity < item.quantity) return false;
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
      
      // Atualiza localmente imediatamente
      storage.saveInventory(inventory);
      
      // Registra a transação na aba 'Transacoes'
      // O script do Google Sheets detectará essa transação e atualizará o saldo mestre na aba 'Estoque'
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

  /**
   * Envia dados via POST para o Google Apps Script.
   * Usamos 'no-cors' para evitar problemas de redirecionamento do Google, 
   * garantindo que os dados cheguem à planilha.
   */
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
      console.log(`Dados sincronizados com a aba ${sheetName}`);
    } catch (error) {
      console.error("Falha na sincronização de saída:", error);
    }
  }
};
