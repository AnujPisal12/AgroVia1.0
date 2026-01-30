import { BatchWithDetails, WarehouseId, getProductById, convertCratesToKg, getCrateCapacity } from './types';
import { Order, getAllOrders } from './orderData';
import { getAllBatches, getBatchById } from './mockData';

// Retailer Inventory Record
export interface RetailerInventoryRecord {
  retailerId: string;
  batchId: string;
  warehouseId?: WarehouseId;
  crateCount: number; // Number of crates owned by retailer
  quantityKg: number; // Derived KG from crates
  orderId: string; // Order that brought this inventory
  fulfillmentDate: Date;
  soldQuantity: number; // KG sold
}

const STORAGE_KEY_RETAILER_INVENTORY = 'agrovia_retailer_inventory';

// Get all retailer inventory records
export function getRetailerInventoryRecords(): RetailerInventoryRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY_RETAILER_INVENTORY);
  if (!stored) return [];
  return JSON.parse(stored).map((r: Partial<RetailerInventoryRecord>) => ({
    ...r,
    fulfillmentDate: new Date(r.fulfillmentDate)
  }));
}

// Get retailer inventory (batches with available stock)
export function getRetailerInventory(retailerId: string = 'RET-001'): BatchWithDetails[] {
  const records = getRetailerInventoryRecords();
  const retailerRecords = records.filter(r => r.retailerId === retailerId);
  
  // Build inventory from records
  return retailerRecords
    .filter(r => {
      const availableKg = r.quantityKg - r.soldQuantity;
      return availableKg > 0;
    })
    .map(record => {
      const batch = getBatchById(record.batchId);
      if (!batch) return null;
      
      const availableKg = record.quantityKg - record.soldQuantity;
      return {
        ...batch,
        quantity: availableKg, // Available quantity for retailer
        crateCount: record.crateCount - Math.ceil(record.soldQuantity / getCrateCapacity(batch.cropType)), // Available crates
      };
    })
    .filter((b): b is BatchWithDetails => b !== null);
}

// Add inventory from fulfilled order
export function addRetailerInventory(order: Order, batch: BatchWithDetails): void {
  if (order.status !== 'Fulfilled') {
    throw new Error('Order must be fulfilled before adding to retailer inventory');
  }
  
  const records = getRetailerInventoryRecords();
  const existingIndex = records.findIndex(
    r => r.retailerId === order.retailerId && r.batchId === order.batchId
  );
  
  const crateCount = order.quantity;
  const quantityKg = order.quantityKg || convertCratesToKg(crateCount, batch.cropType);
  
  if (existingIndex >= 0) {
    // Update existing record
    records[existingIndex].crateCount += crateCount;
    records[existingIndex].quantityKg += quantityKg;
  } else {
    // Create new record
    records.push({
      retailerId: order.retailerId,
      batchId: order.batchId,
      warehouseId: order.warehouseId,
      crateCount,
      quantityKg,
      orderId: order.orderId,
      fulfillmentDate: order.fulfillmentDate || new Date(),
      soldQuantity: 0,
    });
  }
  
  localStorage.setItem(STORAGE_KEY_RETAILER_INVENTORY, JSON.stringify(records));
}

// Reduce retailer inventory (on sale)
export function reduceRetailerInventory(retailerId: string, batchId: string, quantityKg: number): boolean {
  const records = getRetailerInventoryRecords();
  const record = records.find(r => r.retailerId === retailerId && r.batchId === batchId);
  
  if (!record) {
    throw new Error(`Inventory not found for batch ${batchId}`);
  }
  
  const availableKg = record.quantityKg - record.soldQuantity;
  if (quantityKg > availableKg) {
    throw new Error(`Insufficient inventory. Available: ${availableKg}kg, Requested: ${quantityKg}kg`);
  }
  
  record.soldQuantity += quantityKg;
  localStorage.setItem(STORAGE_KEY_RETAILER_INVENTORY, JSON.stringify(records));
  return true;
}

// Get available quantity for retailer
export function getRetailerAvailableQuantity(retailerId: string, batchId: string): number {
  const records = getRetailerInventoryRecords();
  const record = records.find(r => r.retailerId === retailerId && r.batchId === batchId);
  
  if (!record) return 0;
  return Math.max(0, record.quantityKg - record.soldQuantity);
}

// Sync fulfilled orders to retailer inventory (call this after order fulfillment)
export function syncFulfilledOrdersToInventory(retailerId: string = 'RET-001'): void {
  const orders = getAllOrders();
  const fulfilledOrders = orders.filter(
    o => o.retailerId === retailerId && o.status === 'Fulfilled' && o.fulfillmentDate
  );
  
  const records = getRetailerInventoryRecords();
  const existingOrderIds = new Set(records.map(r => r.orderId));
  
  fulfilledOrders.forEach(order => {
    if (!existingOrderIds.has(order.orderId)) {
      const batch = getBatchById(order.batchId);
      if (batch) {
        addRetailerInventory(order, batch);
      }
    }
  });
}
