import { WarehouseId, GRADE_MULTIPLIER } from './types';

export interface MarketPriceRow {
  commodity: string;
  market: string;
  dateSerial: number;
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
}

export interface ModalPriceInfo {
  market: string;
  commodity: string;
  modalPrice: number;
  dateSerial: number;
}

interface MarketPriceCache {
  rows: MarketPriceRow[];
  fetchedAt: number;
}

const STORAGE_KEY = 'agrovia_market_price_cache';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

const CSV_URL =
  import.meta.env.VITE_MARKET_PRICE_CSV_URL || '/marketprice.csv';

// Map internal product IDs to CSV commodity names
const PRODUCT_TO_COMMODITY: Record<string, string> = {
  tomato: 'Tomato',
  potato: 'Potato',
  onion: 'Onion',
  cabbage: 'Cabbage',
  carrot: 'Carrot',
  spinach: 'Spinach',
  cauliflower: 'Cauliflower',
  capsicum: 'Capsicum',
  cucumber: 'Cucumber',
  eggplant: 'Brinjal',
};

// Map warehouses to CSV market names
const WAREHOUSE_TO_MARKET: Record<WarehouseId, string> = {
  mumbai: 'Mumbai',
  pune: 'Pune',
  satara: 'Satara',
};

let inMemoryCache: MarketPriceCache | null = null;

function parseNumber(value: string): number {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : NaN;
}

function parseCsv(text: string): MarketPriceRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const header = lines[0].split(',');
  const commodityIdx = header.indexOf('Commodity');
  const marketIdx = header.indexOf('Market');
  const dateIdx = header.indexOf('Date');
  const minIdx = header.indexOf('Min Price');
  const modalIdx = header.indexOf('Modal Price');
  const maxIdx = header.indexOf('Max Price');

  if (
    commodityIdx === -1 ||
    marketIdx === -1 ||
    dateIdx === -1 ||
    modalIdx === -1
  ) {
    return [];
  }

  const rows: MarketPriceRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    const cols = raw.split(',');
    const commodity = cols[commodityIdx]?.trim();
    const market = cols[marketIdx]?.trim();
    const dateSerial = parseNumber(cols[dateIdx] || '');
    const minPrice = minIdx !== -1 ? parseNumber(cols[minIdx] || '') : NaN;
    const modalPrice = parseNumber(cols[modalIdx] || '');
    const maxPrice = maxIdx !== -1 ? parseNumber(cols[maxIdx] || '') : NaN;

    if (!commodity || !market || !Number.isFinite(modalPrice)) continue;

    rows.push({
      commodity,
      market,
      dateSerial: Number.isFinite(dateSerial) ? dateSerial : 0,
      minPrice,
      modalPrice,
      maxPrice,
    });
  }

  return rows;
}

function loadCacheFromStorage(): MarketPriceCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketPriceCache;
    if (!parsed.rows || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(cache: MarketPriceCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export async function loadMarketPrices(): Promise<MarketPriceRow[]> {
  const now = Date.now();

  if (inMemoryCache && now - inMemoryCache.fetchedAt < CACHE_TTL_MS) {
    return inMemoryCache.rows;
  }

  const stored = loadCacheFromStorage();
  if (stored && now - stored.fetchedAt < CACHE_TTL_MS) {
    inMemoryCache = stored;
    return stored.rows;
  }

  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch market prices from ${CSV_URL}`);
    }
    const text = await response.text();
    const rows = parseCsv(text);
    const cache: MarketPriceCache = { rows, fetchedAt: now };
    inMemoryCache = cache;
    saveCache(cache);
    return rows;
  } catch (e) {
    // On error, fall back to any existing cache
    if (inMemoryCache) return inMemoryCache.rows;
    if (stored) return stored.rows;
    return [];
  }
}

export async function getLatestMarketRow(
  commodity: string,
  market: string
): Promise<MarketPriceRow | null> {
  const rows = await loadMarketPrices();
  const filtered = rows.filter(
    (r) =>
      r.commodity.toLowerCase() === commodity.toLowerCase() &&
      r.market.toLowerCase() === market.toLowerCase()
  );
  if (filtered.length === 0) return null;
  // Pick row with highest date serial
  return filtered.reduce((latest, row) =>
    row.dateSerial > latest.dateSerial ? row : latest
  );
}

export async function getModalPriceForWarehouse(
  productId: string,
  warehouseId?: WarehouseId
): Promise<ModalPriceInfo | null> {
  if (!warehouseId) return null;

  const commodity = PRODUCT_TO_COMMODITY[productId];
  if (!commodity) return null;

  const market = WAREHOUSE_TO_MARKET[warehouseId];
  if (!market) return null;

  const row = await getLatestMarketRow(commodity, market);
  if (!row) return null;

  return {
    market: row.market,
    commodity: row.commodity,
    modalPrice: row.modalPrice,
    dateSerial: row.dateSerial,
  };
}

export function computeFinalPriceFromModal(
  modalPrice: number,
  grade: keyof typeof GRADE_MULTIPLIER
): number {
  const multiplier = GRADE_MULTIPLIER[grade] ?? 1;
  return Math.round(modalPrice * multiplier);
}

// Compute 3-tier pricing: farmer payout, warehouse price, retailer selling price
export function computeThreeTierPricing(
  modalPrice: number,
  grade: keyof typeof GRADE_MULTIPLIER
): {
  farmerPayoutPerUnit: number;
  warehousePricePerUnit: number;
  retailerSellingPricePerUnit: number;
} {
  const gradeMultiplier = GRADE_MULTIPLIER[grade] ?? 1;
  
  // Farmer gets modal price with small reduction (5% discount for platform)
  const farmerPayoutPerUnit = Math.round(modalPrice * 0.95);
  
  // Warehouse price = modal price + testing cost (₹2/kg) + logistics markup (8%)
  const warehousePricePerUnit = Math.round((modalPrice + 2) * 1.08 * gradeMultiplier);
  
  // Retailer selling price = warehouse price + retailer margin (15%)
  const retailerSellingPricePerUnit = Math.round(warehousePricePerUnit * 1.15);
  
  return {
    farmerPayoutPerUnit,
    warehousePricePerUnit,
    retailerSellingPricePerUnit,
  };
}

