
export interface Material {
  id: string;
  code: string;
  name: string;
}

export interface InventoryItem extends Material {
  quantity: number;
}

export interface MaterialRequest {
  id: string;
  vtr: string;
  requesterName: string;
  date: string;
  items: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
  }>;
  status: 'Pendente' | 'Atendido' | 'Não Atendido';
}

export interface StockTransaction {
  id: string;
  materialId: string;
  type: 'entrada' | 'saida';
  quantity: number;
  date: string;
  reason: string;
}
