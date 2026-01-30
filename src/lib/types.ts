export type QualityGrade = 'A' | 'B' | 'C';
export type StorageType = 'Normal' | 'Cold';
export type FreshnessStatus = 'Fresh' | 'Consume Soon' | 'Expired';
export type Firmness = 'Low' | 'Medium' | 'High';

// Product types with emoji and details
export interface ProductType {
  id: string;
  name: string;
  emoji: string;
  category: 'Vegetable' | 'Fruit' | 'Leafy Green' | 'Root Vegetable';
  unit: string;
}

export const PRODUCTS: ProductType[] = [
  // Default vegetables for MVP (must appear first)
  { id: 'potato', name: 'Potato', emoji: '🥔', category: 'Root Vegetable', unit: 'kg' },
  { id: 'onion', name: 'Onion', emoji: '🧅', category: 'Vegetable', unit: 'kg' },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', category: 'Vegetable', unit: 'kg' },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', category: 'Leafy Green', unit: 'kg' },
  // Additional vegetables
  { id: 'carrot', name: 'Carrot', emoji: '🥕', category: 'Root Vegetable', unit: 'kg' },
  { id: 'spinach', name: 'Spinach', emoji: '🥬', category: 'Leafy Green', unit: 'kg' },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦', category: 'Vegetable', unit: 'kg' },
  { id: 'cauliflower', name: 'Cauliflower', emoji: '🥦', category: 'Vegetable', unit: 'kg' },
  { id: 'capsicum', name: 'Capsicum', emoji: '🫑', category: 'Vegetable', unit: 'kg' },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒', category: 'Vegetable', unit: 'kg' },
  { id: 'eggplant', name: 'Eggplant', emoji: '🍆', category: 'Vegetable', unit: 'kg' },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', category: 'Leafy Green', unit: 'kg' },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', category: 'Vegetable', unit: 'kg' },
  { id: 'beetroot', name: 'Beetroot', emoji: '🥕', category: 'Root Vegetable', unit: 'kg' },
  { id: 'radish', name: 'Radish', emoji: '🥕', category: 'Root Vegetable', unit: 'kg' },
  { id: 'ginger', name: 'Ginger', emoji: '🫚', category: 'Root Vegetable', unit: 'kg' },
  { id: 'garlic', name: 'Garlic', emoji: '🧄', category: 'Vegetable', unit: 'kg' },
  { id: 'corn', name: 'Corn', emoji: '🌽', category: 'Vegetable', unit: 'kg' },
  { id: 'peas', name: 'Peas', emoji: '🫛', category: 'Vegetable', unit: 'kg' },
  { id: 'beans', name: 'Beans', emoji: '🫘', category: 'Vegetable', unit: 'kg' },
  { id: 'okra', name: 'Okra (Bhindi)', emoji: '🫛', category: 'Vegetable', unit: 'kg' },
  { id: 'chili', name: 'Green Chili', emoji: '🌶️', category: 'Vegetable', unit: 'kg' },
  { id: 'coriander', name: 'Coriander', emoji: '🌿', category: 'Leafy Green', unit: 'kg' },
  { id: 'mint', name: 'Mint', emoji: '🌿', category: 'Leafy Green', unit: 'kg' },
  // Fruits
  { id: 'apple', name: 'Apple', emoji: '🍎', category: 'Fruit', unit: 'kg' },
  { id: 'banana', name: 'Banana', emoji: '🍌', category: 'Fruit', unit: 'dozen' },
  { id: 'orange', name: 'Orange', emoji: '🍊', category: 'Fruit', unit: 'kg' },
  { id: 'mango', name: 'Mango', emoji: '🥭', category: 'Fruit', unit: 'kg' },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', category: 'Fruit', unit: 'kg' },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', category: 'Fruit', unit: 'piece' },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', category: 'Fruit', unit: 'kg' },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍', category: 'Fruit', unit: 'piece' },
  { id: 'papaya', name: 'Papaya', emoji: '🍈', category: 'Fruit', unit: 'kg' },
  { id: 'pomegranate', name: 'Pomegranate', emoji: '🍎', category: 'Fruit', unit: 'kg' },
  { id: 'guava', name: 'Guava', emoji: '🍐', category: 'Fruit', unit: 'kg' },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', category: 'Fruit', unit: 'kg' },
];

export const getProductById = (id: string): ProductType | undefined =>
  PRODUCTS.find(p => p.id === id);

export interface Farmer {
  farmerId: string;
  farmerCode: string;
  name: string;
}

export type WarehouseId = 'mumbai' | 'pune' | 'satara';
export type BatchStatus = 'Registered' | 'Test Pending' | 'Tested' | 'Stored';

export interface Warehouse {
  id: WarehouseId;
  name: string;
  location: string;
  storageCapacity: number; // in crates
}

export const WAREHOUSES: Warehouse[] = [
  { id: 'mumbai', name: 'Mumbai Warehouse', location: 'Mumbai, Maharashtra', storageCapacity: 1000 },
  { id: 'pune', name: 'Pune Warehouse', location: 'Pune, Maharashtra', storageCapacity: 800 },
  { id: 'satara', name: 'Satara Warehouse', location: 'Satara, Maharashtra', storageCapacity: 600 },
];

export const getWarehouseById = (id: WarehouseId | string): Warehouse | undefined =>
  WAREHOUSES.find(w => w.id === id);

// Crate capacity per crop (kg per crate) - Default vegetables have specific rules
export const CRATE_CAPACITY: Record<string, { min: number; max: number; default: number }> = {
  // Default vegetables (MVP)
  potato: { min: 12, max: 15, default: 15 }, // 1 crate = 15 kg
  onion: { min: 12, max: 15, default: 15 },  // 1 crate = 15 kg
  tomato: { min: 8, max: 12, default: 10 },  // 1 crate = 10 kg
  cabbage: { min: 10, max: 15, default: 12 }, // 1 crate = 12 kg
  // Additional vegetables
  carrot: { min: 10, max: 15, default: 12 },
  spinach: { min: 8, max: 12, default: 10 },
  broccoli: { min: 10, max: 15, default: 12 },
  cauliflower: { min: 10, max: 15, default: 12 },
  capsicum: { min: 10, max: 15, default: 12 },
  cucumber: { min: 10, max: 15, default: 12 },
  eggplant: { min: 10, max: 15, default: 12 },
  lettuce: { min: 8, max: 12, default: 10 },
  pumpkin: { min: 12, max: 18, default: 15 },
  beetroot: { min: 10, max: 15, default: 12 },
  radish: { min: 10, max: 15, default: 12 },
  ginger: { min: 10, max: 15, default: 12 },
  garlic: { min: 10, max: 15, default: 12 },
  corn: { min: 10, max: 15, default: 12 },
  peas: { min: 8, max: 12, default: 10 },
  beans: { min: 8, max: 12, default: 10 },
  okra: { min: 8, max: 12, default: 10 },
  chili: { min: 5, max: 10, default: 8 },
  coriander: { min: 5, max: 10, default: 8 },
  mint: { min: 5, max: 10, default: 8 },
  // Fruits
  apple: { min: 12, max: 15, default: 14 },
  banana: { min: 10, max: 15, default: 12 },
  orange: { min: 10, max: 15, default: 12 },
  mango: { min: 10, max: 15, default: 12 },
  grapes: { min: 8, max: 12, default: 10 },
  watermelon: { min: 10, max: 15, default: 12 },
  strawberry: { min: 8, max: 12, default: 10 },
  pineapple: { min: 10, max: 15, default: 12 },
  papaya: { min: 10, max: 15, default: 12 },
  pomegranate: { min: 10, max: 15, default: 12 },
  guava: { min: 10, max: 15, default: 12 },
  lemon: { min: 8, max: 12, default: 10 },
};

export function getCrateCapacity(productId: string): number {
  return CRATE_CAPACITY[productId]?.default || 12;
}

export function convertKgToCrates(kg: number, productId: string): number {
  const capacity = getCrateCapacity(productId);
  return Math.ceil(kg / capacity);
}

export function convertCratesToKg(crates: number, productId: string): number {
  const capacity = getCrateCapacity(productId);
  return crates * capacity;
}

export interface Batch {
  batchId: string;
  cropType: string;
  harvestDate: Date;
  farmerId: string;
  quantity: number; // in KG (for backward compatibility, but stored as crates)
  qualityGrade: QualityGrade | null;
  createdAt: Date;
  warehouseId?: WarehouseId; // Warehouse where batch is stored
  crateCount?: number; // Number of crates
  status?: BatchStatus; // Status progression
}

export interface QualityTest {
  testId?: string;
  batchId?: string;
  visualQuality?: number; // 1-5
  freshnessDays?: number;
  firmness?: Firmness;
  finalGrade?: QualityGrade;
  testDate: Date;
  // Flexible fields for different grading implementations
  visualAppearanceScore?: number;
  performedBy?: string;
  notes?: string;
}

export interface Storage {
  batchId: string;
  storageType: StorageType;
  entryDate: Date;
  expectedShelfLife: number;
  expiryDate: Date;
}

export interface RetailStatus {
  batchId: string;
  sellByDate: Date;
  remainingDays: number;
  status: FreshnessStatus;
  saleAllowed: boolean;
}

export interface QRMapping {
  qrId: string;
  batchId: string;
  publicUrl: string;
}

export interface BatchPricing {
  market: string;
  commodity: string;
  modalPrice: number;
  // 3-tier pricing structure
  farmerPayoutPerUnit: number; // What farmer gets (base modal price, slightly reduced)
  warehousePricePerUnit: number; // What retailer pays warehouse (includes testing + logistics markup)
  retailerSellingPricePerUnit: number; // What retailer sells to customer (includes retailer margin)
  csvDate: string;
  computedAt: string;
  source: 'csv';
}

export interface BatchWithDetails extends Batch {
  qualityTest?: QualityTest;
  storage?: Storage;
  retailStatus?: RetailStatus;
  qrMapping?: QRMapping;
  farmer?: Farmer;
  warehouse?: Warehouse; // Resolved warehouse object
  image?: string;
  notes?: string;
  pricing?: BatchPricing;
}

// Shelf life rules (in days) - applies to all produce
export const SHELF_LIFE_RULES: Record<QualityGrade, { normal: number; cold: number }> = {
  A: { normal: 7, cold: 12 },
  B: { normal: 5, cold: 9 },
  C: { normal: 3, cold: 6 },
};

// Product-specific shelf life modifiers
export const PRODUCT_SHELF_LIFE_MODIFIER: Record<string, number> = {
  tomato: 1.0,
  potato: 3.0,      // Potatoes last much longer
  onion: 2.5,
  carrot: 2.0,
  cabbage: 1.5,
  spinach: 0.5,     // Leafy greens spoil faster
  broccoli: 0.8,
  cauliflower: 1.0,
  capsicum: 1.0,
  cucumber: 0.8,
  eggplant: 1.0,
  lettuce: 0.4,     // Very short shelf life
  pumpkin: 2.5,
  beetroot: 2.0,
  radish: 1.5,
  ginger: 3.0,
  garlic: 3.5,
  corn: 0.6,
  peas: 0.5,
  beans: 0.7,
  okra: 0.6,
  chili: 1.0,
  coriander: 0.3,
  mint: 0.3,
  apple: 2.0,
  banana: 0.6,
  orange: 2.0,
  mango: 0.8,
  grapes: 0.7,
  watermelon: 1.2,
  strawberry: 0.4,
  pineapple: 1.0,
  papaya: 0.7,
  pomegranate: 2.0,
  guava: 0.8,
  lemon: 2.5,
};

// Base price per unit by product
export const BASE_PRICE_PER_UNIT: Record<string, number> = {
  tomato: 40,
  potato: 30,
  onion: 35,
  carrot: 45,
  cabbage: 25,
  spinach: 60,
  broccoli: 80,
  cauliflower: 50,
  capsicum: 70,
  cucumber: 35,
  eggplant: 45,
  lettuce: 55,
  pumpkin: 30,
  beetroot: 50,
  radish: 40,
  ginger: 120,
  garlic: 100,
  corn: 35,
  peas: 80,
  beans: 60,
  okra: 50,
  chili: 90,
  coriander: 40,
  mint: 50,
  apple: 120,
  banana: 50,
  orange: 80,
  mango: 150,
  grapes: 100,
  watermelon: 40,
  strawberry: 200,
  pineapple: 60,
  papaya: 45,
  pomegranate: 140,
  guava: 60,
  lemon: 70,
};

// Grade multipliers for pricing
export const GRADE_MULTIPLIER: Record<QualityGrade, number> = {
  A: 1.2,
  B: 1.0,
  C: 0.7,
};

// Legacy price per kg (for backward compatibility)
export const PRICE_PER_KG: Record<QualityGrade, number> = {
  A: 12,
  B: 9,
  C: 6,
};

// Get price for a product based on grade
// Get price for a product based on grade
export const getProductPrice = (productId: string, grade: QualityGrade): number => {
  const basePrice = BASE_PRICE_PER_UNIT[productId] || 50;

  // SIMULATE MARKET FLUCTUATION:
  // Random fluctuation between -5% and +15% to simulate daily market changes
  // In a real app, this would come from an external API (e.g., eNAM or local mandi rates)
  const today = new Date();
  const seed = today.getDate() + today.getMonth() * 31 + productId.charCodeAt(0);
  const fluctuation = Math.sin(seed) * 0.10 + 0.05; // deterministic "random" for the day

  const marketPrice = basePrice * (1 + fluctuation);

  return Math.round(marketPrice * GRADE_MULTIPLIER[grade]);
};
