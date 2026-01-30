import { Warehouse, WarehouseId, BatchWithDetails, getWarehouseById } from './types';
import { getAllBatches } from './mockData';

const STORAGE_KEY_WAREHOUSES = 'agrovia_warehouses';

// Initialize default warehouses
function initializeWarehouses() {
  const stored = localStorage.getItem(STORAGE_KEY_WAREHOUSES);
  if (!stored) {
    const defaultWarehouses = [
      { id: 'mumbai', name: 'Mumbai Warehouse', location: 'Mumbai, Maharashtra', storageCapacity: 1000 },
      { id: 'pune', name: 'Pune Warehouse', location: 'Pune, Maharashtra', storageCapacity: 800 },
      { id: 'satara', name: 'Satara Warehouse', location: 'Satara, Maharashtra', storageCapacity: 600 },
    ];
    localStorage.setItem(STORAGE_KEY_WAREHOUSES, JSON.stringify(defaultWarehouses));
  }
}

export function getAllWarehouses(): Warehouse[] {
  initializeWarehouses();
  return JSON.parse(localStorage.getItem(STORAGE_KEY_WAREHOUSES) || '[]');
}

export function getWarehouseInventory(warehouseId: WarehouseId): BatchWithDetails[] {
  // Include batches in warehouse regardless of status (Test Pending, Tested, Stored)
  return getAllBatches().filter(b => b.warehouseId === warehouseId && (b.status === 'Test Pending' || b.status === 'Tested' || b.status === 'Stored'));
}

export function getWarehouseInventoryStored(warehouseId: WarehouseId): BatchWithDetails[] {
  // Only stored batches (ready for sale)
  return getAllBatches().filter(b => b.warehouseId === warehouseId && b.status === 'Stored' && b.qualityGrade !== null);
}

export function getWarehouseCrateCount(warehouseId: WarehouseId): number {
  const inventory = getWarehouseInventory(warehouseId);
  return inventory.reduce((sum, batch) => sum + (batch.crateCount || 0), 0);
}

export function getWarehouseCapacity(warehouseId: WarehouseId): { used: number; total: number; available: number } {
  const warehouse = getWarehouseById(warehouseId);
  if (!warehouse) return { used: 0, total: 0, available: 0 };
  
  const used = getWarehouseCrateCount(warehouseId);
  const total = warehouse.storageCapacity;
  
  return {
    used,
    total,
    available: Math.max(0, total - used)
  };
}

export function addBatchToWarehouse(batchId: string, warehouseId: WarehouseId, crateCount: number): boolean {
  const batches = getAllBatches();
  const batchIndex = batches.findIndex(b => b.batchId === batchId);
  
  if (batchIndex === -1) {
    throw new Error(`Batch ${batchId} not found`);
  }
  
  // Validate warehouse capacity
  const capacity = getWarehouseCapacity(warehouseId);
  if (capacity.available < crateCount) {
    throw new Error(`Insufficient capacity in warehouse. Available: ${capacity.available} crates, Required: ${crateCount} crates`);
  }
  
  // Update batch with warehouse info (but keep status as Test Pending initially)
  batches[batchIndex].warehouseId = warehouseId;
  batches[batchIndex].crateCount = crateCount;
  // Don't change status here - it's set in FarmerIntake as 'Test Pending'
  // Status will be updated to 'Stored' after quality testing
  
  // Update warehouse object reference
  const warehouse = getWarehouseById(warehouseId);
  if (warehouse) {
    batches[batchIndex].warehouse = warehouse;
  }
  
  localStorage.setItem('agrovia_batches', JSON.stringify(batches));
  return true;
}

// Validate batch is in warehouse inventory
export function validateBatchInWarehouse(batchId: string, warehouseId: WarehouseId): boolean {
  const batch = getAllBatches().find(b => b.batchId === batchId);
  if (!batch) return false;
  return batch.warehouseId === warehouseId && (batch.status === 'Test Pending' || batch.status === 'Tested' || batch.status === 'Stored');
}
