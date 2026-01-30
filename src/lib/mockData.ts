import { Farmer, Batch, QualityTest, Storage, RetailStatus, QRMapping, BatchWithDetails, QualityGrade, StorageType, PRODUCTS, WarehouseId, WAREHOUSES, convertKgToCrates } from './types';
import { calculateExpiryDate, calculateRemainingDays, determineFreshnessStatus, isSaleAllowed, generateBatchId, generateQRId } from './freshness';
import { subDays, addDays } from 'date-fns';

// Initial mock farmers
const initialFarmers: Farmer[] = [
  { farmerId: 'F001', farmerCode: 'FRM-A1X', name: 'Farmer A' },
  { farmerId: 'F002', farmerCode: 'FRM-B2Y', name: 'Farmer B' },
  { farmerId: 'F003', farmerCode: 'FRM-C3Z', name: 'Farmer C' },
];

function createMockBatch(
  farmerId: string,
  daysAgo: number,
  quantity: number,
  grade: QualityGrade,
  storageType: StorageType,
  productId: string = 'tomato',
  warehouseId: WarehouseId = 'mumbai'
): BatchWithDetails {
  const batchId = generateBatchId();
  const harvestDate = subDays(new Date(), daysAgo);
  const expiryDate = calculateExpiryDate(harvestDate, grade, storageType, productId);
  const remainingDays = calculateRemainingDays(expiryDate);
  const status = determineFreshnessStatus(remainingDays);

  // Convert KG to crates
  const crateCount = convertKgToCrates(quantity, productId);

  const batch: Batch = {
    batchId,
    cropType: productId, // Store productId, not name
    harvestDate,
    farmerId,
    quantity,
    qualityGrade: grade,
    createdAt: harvestDate,
    warehouseId,
    crateCount,
    status: 'Stored', // Mock data is already tested and stored
  };

  const qualityTest: QualityTest = {
    testId: `TEST-${batchId}`,
    batchId,
    visualQuality: grade === 'A' ? 5 : grade === 'B' ? 3 : 2,
    freshnessDays: grade === 'A' ? 7 : grade === 'B' ? 5 : 3,
    firmness: grade === 'A' ? 'High' : grade === 'B' ? 'Medium' : 'Low',
    finalGrade: grade,
    testDate: harvestDate,
  };

  const storage: Storage = {
    batchId,
    storageType,
    entryDate: harvestDate,
    expectedShelfLife: expiryDate.getTime() - harvestDate.getTime(),
    expiryDate,
  };

  const retailStatus: RetailStatus = {
    batchId,
    sellByDate: expiryDate,
    remainingDays,
    status,
    saleAllowed: isSaleAllowed(status),
  };

  const qrMapping: QRMapping = {
    qrId: generateQRId(),
    batchId,
    publicUrl: `/scan/${batchId}`,
  };

  const warehouse = WAREHOUSES.find(w => w.id === warehouseId);

  return {
    ...batch,
    qualityTest,
    storage,
    retailStatus,
    qrMapping,
    farmer: initialFarmers.find(f => f.farmerId === farmerId),
    warehouse,
  };
}

// Create initial mock data with default vegetables (for MVP stability)
const initialBatches: BatchWithDetails[] = [
  // Default vegetables: Potato, Onion, Tomato, Cabbage - distributed across warehouses
  createMockBatch('F001', 2, 150, 'A', 'Cold', 'tomato', 'mumbai'),      // Tomato: 150kg = ~15 crates in Mumbai
  createMockBatch('F002', 5, 225, 'B', 'Normal', 'potato', 'pune'),      // Potato: 225kg = ~15 crates in Pune (15kg per crate)
  createMockBatch('F001', 4, 180, 'A', 'Normal', 'onion', 'satara'),     // Onion: 180kg = ~12 crates in Satara (15kg per crate)
  createMockBatch('F003', 3, 120, 'B', 'Cold', 'cabbage', 'mumbai'),     // Cabbage: 120kg = ~10 crates in Mumbai (12kg per crate)
  // Additional examples
  createMockBatch('F001', 1, 40, 'A', 'Cold', 'carrot', 'pune'),         // Fresh carrots in Pune
  createMockBatch('F003', 3, 30, 'C', 'Normal', 'tomato', 'satara'),     // More tomatoes in Satara
];

// Storage keys
const STORAGE_KEY_BATCHES = 'agrovia_batches';
const STORAGE_KEY_FARMERS = 'agrovia_farmers';

// Initialize storage if empty
function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEY_BATCHES)) {
    localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(initialBatches));
  }
  if (!localStorage.getItem(STORAGE_KEY_FARMERS)) {
    localStorage.setItem(STORAGE_KEY_FARMERS, JSON.stringify(initialFarmers));
  }
}

// Get all batches with updated status
export function getAllBatches(): BatchWithDetails[] {
  initializeStorage();
  const batches: BatchWithDetails[] = JSON.parse(localStorage.getItem(STORAGE_KEY_BATCHES) || '[]');
  
  // Update remaining days and status dynamically
  return batches.map(batch => {
    if (batch.storage && batch.retailStatus) {
      const remainingDays = calculateRemainingDays(new Date(batch.storage.expiryDate));
      const status = determineFreshnessStatus(remainingDays);
      return {
        ...batch,
        harvestDate: new Date(batch.harvestDate),
        createdAt: new Date(batch.createdAt),
        storage: {
          ...batch.storage,
          entryDate: new Date(batch.storage.entryDate),
          expiryDate: new Date(batch.storage.expiryDate),
        },
        retailStatus: {
          ...batch.retailStatus,
          remainingDays,
          status,
          saleAllowed: isSaleAllowed(status),
          sellByDate: new Date(batch.retailStatus.sellByDate),
        },
        qualityTest: batch.qualityTest ? {
          ...batch.qualityTest,
          testDate: new Date(batch.qualityTest.testDate),
        } : undefined,
      };
    }
    return batch;
  });
}

// Get batch by ID
export function getBatchById(batchId: string): BatchWithDetails | undefined {
  const batches = getAllBatches();
  return batches.find(b => b.batchId === batchId);
}

// Get all farmers
export function getAllFarmers(): Farmer[] {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEY_FARMERS) || '[]');
}

// Add new batch
export function addBatch(batch: BatchWithDetails): void {
  const batches = getAllBatches();
  batches.push(batch);
  localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
}

// Add new farmer
export function addFarmer(farmer: Farmer): void {
  const farmers = getAllFarmers();
  farmers.push(farmer);
  localStorage.setItem(STORAGE_KEY_FARMERS, JSON.stringify(farmers));
}

// Get analytics data
export function getAnalytics() {
  const batches = getAllBatches();
  const totalBatches = batches.length;
  const expiredBatches = batches.filter(b => b.retailStatus?.status === 'Expired').length;
  const freshBatches = batches.filter(b => b.retailStatus?.status === 'Fresh').length;
  const consumeSoonBatches = batches.filter(b => b.retailStatus?.status === 'Consume Soon').length;
  
  // Calculate total quantity
  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  const expiredQuantity = batches
    .filter(b => b.retailStatus?.status === 'Expired')
    .reduce((sum, b) => sum + b.quantity, 0);
  
  // Estimate waste prevented (assuming 30% of consume soon would have expired without tracking)
  const potentialWastePrevented = Math.round(consumeSoonBatches * 0.3 * 25); // avg 25kg per batch
  
  // Average shelf life by grade
  const gradeStats = {
    A: batches.filter(b => b.qualityGrade === 'A').length,
    B: batches.filter(b => b.qualityGrade === 'B').length,
    C: batches.filter(b => b.qualityGrade === 'C').length,
  };

  return {
    totalBatches,
    expiredBatches,
    freshBatches,
    consumeSoonBatches,
    totalQuantity,
    expiredQuantity,
    potentialWastePrevented,
    gradeStats,
    preventedSalesCount: expiredBatches, // Expired items blocked from sale
  };
}

// Reset to initial data
export function resetData(): void {
  localStorage.removeItem(STORAGE_KEY_BATCHES);
  localStorage.removeItem(STORAGE_KEY_FARMERS);
  initializeStorage();
}
