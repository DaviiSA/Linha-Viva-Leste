
import { neon } from '@neondatabase/serverless';
import { InventoryItem, MaterialRequest, StockTransaction } from '../types';
import { MATERIALS } from '../constants';

// Tenta obter a URL do ambiente com segurança
const getDatabaseUrl = () => {
  try {
    return process.env.DATABASE_URL || "";
  } catch (e) {
    return "";
  }
};

const DATABASE_URL = getDatabaseUrl();

// Inicializa o cliente SQL apenas se a URL existir
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

const KEYS = {
  INVENTORY: 'lv_inventory',
  REQUESTS: 'lv_requests',
  TRANSACTIONS: 'lv_transactions'
};

export const storage = {
  /**
   * Inicializa o banco de dados criando as tabelas se não existirem.
   */
  initDb: async () => {
    if (!sql) return;
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS inventory (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          quantity INTEGER DEFAULT 0
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          vtr TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          items JSONB NOT NULL,
          status TEXT DEFAULT 'Pendente',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          material_id TEXT NOT NULL,
          type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          reason TEXT,
          balance_after INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (e) {
      console.error("Erro ao inicializar tabelas no Neon:", e);
      throw e;
    }
  },

  fetchInventoryFromCloud: async (): Promise<InventoryItem[] | null> => {
    if (!sql) {
      console.warn("Neon Database: URL não configurada. Usando modo offline.");
      return storage.getInventory();
    }

    try {
      await storage.initDb();

      const cloudData = await sql`SELECT * FROM inventory`;
      
      if (cloudData.length === 0) {
        console.log("Neon Database: Populando banco inicial...");
        for (const m of MATERIALS) {
          await sql`
            INSERT INTO inventory (id, code, name, quantity) 
            VALUES (${m.id}, ${m.code}, ${m.name}, 0)
            ON CONFLICT (id) DO NOTHING
          `;
        }
        const initial = MATERIALS.map(m => ({ ...m, quantity: 0 }));
        storage.saveInventory(initial);
        return initial;
      }

      const syncedInventory = MATERIALS.map(m => {
        const cloudItem = cloudData.find((c: any) => c.id === m.id);
        return {
          ...m,
          quantity: cloudItem ? Number(cloudItem.quantity) : 0
        };
      });

      storage.saveInventory(syncedInventory);
      
      try {
        const cloudRequests = await sql`SELECT * FROM requests ORDER BY created_at DESC LIMIT 50`;
        const formattedRequests: MaterialRequest[] = cloudRequests.map((r: any) => ({
          id: r.id,
          vtr: r.vtr,
          requesterName: r.requester_name,
          date: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          items: r.items,
          status: r.status
        }));
        localStorage.setItem(KEYS.REQUESTS, JSON.stringify(formattedRequests));
      } catch (reqErr) {
        console.warn("Erro ao carregar solicitações do Neon:", reqErr);
      }

      return syncedInventory;
    } catch (error) {
      console.error("Neon Database: Erro de conexão, mantendo dados locais:", error);
      return storage.getInventory();
    }
  },

  getInventory: (): InventoryItem[] => {
    const data = localStorage.getItem(KEYS.INVENTORY);
    if (!data) return MATERIALS.map(m => ({ ...m, quantity: 0 }));
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
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify([req, ...current]));
    
    if (sql) {
      try {
        await sql`
          INSERT INTO requests (id, vtr, requester_name, items, status)
          VALUES (${req.id}, ${req.vtr}, ${req.requesterName}, ${JSON.stringify(req.items)}, ${req.status})
        `;
      } catch (e) {
        console.error("Erro ao salvar solicitação no Neon:", e);
      }
    }
  },

  updateRequestStatus: async (id: string, status: MaterialRequest['status']): Promise<boolean> => {
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

      for (const item of request.items) {
        await storage.saveTransaction({
          id: `req-out-${id}-${item.materialId}`,
          materialId: item.materialId,
          type: 'saida',
          quantity: item.quantity,
          date: new Date().toISOString(),
          reason: `Atendimento VTR ${request.vtr}`
        });
      }
    }

    const updatedRequests = currentRequests.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updatedRequests));

    if (sql) {
      try {
        await sql`UPDATE requests SET status = ${status} WHERE id = ${id}`;
      } catch (e) {
        console.error("Erro ao atualizar status no Neon:", e);
      }
    }
    return true;
  },

  getTransactions: (): StockTransaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: async (tx: StockTransaction) => {
    const current = storage.getTransactions();
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([tx, ...current]));
    
    const inventory = storage.getInventory();
    const itemIdx = inventory.findIndex(i => i.id === tx.materialId);
    
    if (itemIdx > -1) {
      if (tx.type === 'entrada') {
        inventory[itemIdx].quantity += tx.quantity;
      } else {
        inventory[itemIdx].quantity = Math.max(0, inventory[itemIdx].quantity - tx.quantity);
      }
      
      const newQuantity = inventory[itemIdx].quantity;
      storage.saveInventory(inventory);
      
      if (sql) {
        try {
          await sql`
            UPDATE inventory 
            SET quantity = ${newQuantity} 
            WHERE id = ${tx.materialId}
          `;
          await sql`
            INSERT INTO transactions (id, material_id, type, quantity, reason, balance_after)
            VALUES (${tx.id}, ${tx.materialId}, ${tx.type}, ${tx.quantity}, ${tx.reason}, ${newQuantity})
          `;
        } catch (e) {
          console.error("Erro na transação Neon:", e);
        }
      }
    }
  }
};
