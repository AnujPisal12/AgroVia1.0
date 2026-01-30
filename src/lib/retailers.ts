export interface RetailerStore {
  retailerId: string;
  storeName: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  gstin?: string;
}

export const RETAILER_STORES: RetailerStore[] = [
  {
    retailerId: 'RET-001',
    storeName: 'AgroVia Fresh Mart',
    ownerName: 'Rohit Sharma',
    phone: '+91 98765 43210',
    address: 'Shop 12, Market Road, Pune, Maharashtra',
    gstin: '27ABCDE1234F1Z5',
  },
  {
    retailerId: 'RET-002',
    storeName: 'Green Valley Store',
    ownerName: 'Priya Patel',
    phone: '+91 98765 43211',
    address: 'Plot 45, Andheri West, Mumbai, Maharashtra',
    gstin: '27ABCDE1234F1Z6',
  },
  {
    retailerId: 'RET-003',
    storeName: 'Farm Fresh Mart',
    ownerName: 'Amit Deshmukh',
    phone: '+91 98765 43212',
    address: 'Main Road, Satara, Maharashtra',
    gstin: '27ABCDE1234F1Z7',
  },
];

export function getRetailerStoreById(retailerId: string): RetailerStore | undefined {
  return RETAILER_STORES.find(r => r.retailerId === retailerId);
}

export interface DriverAssignment {
  driverId: string;
  driverName: string;
  phone?: string;
  truckId: string;
  truckNumber: string;
  status?: 'Available' | 'On Delivery' | 'Returning' | 'Maintenance';
  currentLocation?: string;
  assignedOrderId?: string;
  currentRoute?: {
    from: string;
    to: string;
    progress: number; // 0-100
    eta: string;
  };
  lastUpdate?: Date;
  totalDeliveries?: number;
  rating?: number;
}

export const DEFAULT_DRIVER_ASSIGNMENTS: DriverAssignment[] = [
  {
    driverId: 'DRV-001',
    driverName: 'Mahesh Kumar',
    phone: '+91 99887 77665',
    truckId: 'TRK-01',
    truckNumber: 'MH 12 AB 1234',
    status: 'On Delivery',
    currentLocation: 'En route to Pune',
    assignedOrderId: 'ORD-001',
    currentRoute: {
      from: 'Satara Warehouse',
      to: 'Pune Hub',
      progress: 65,
      eta: '45 mins'
    },
    lastUpdate: new Date(),
    totalDeliveries: 127,
    rating: 4.8
  },
  {
    driverId: 'DRV-002',
    driverName: 'Imran Shaikh',
    phone: '+91 99112 23344',
    truckId: 'TRK-02',
    truckNumber: 'MH 14 CD 5678',
    status: 'On Delivery',
    currentLocation: 'Mumbai to Retailer',
    assignedOrderId: 'ORD-002',
    currentRoute: {
      from: 'Mumbai Hub',
      to: 'Green Valley Store',
      progress: 30,
      eta: '1.2 hrs'
    },
    lastUpdate: new Date(),
    totalDeliveries: 89,
    rating: 4.6
  },
  {
    driverId: 'DRV-003',
    driverName: 'Rajesh Patil',
    phone: '+91 98765 12345',
    truckId: 'TRK-03',
    truckNumber: 'MH 15 EF 9012',
    status: 'Available',
    currentLocation: 'Mumbai Warehouse',
    lastUpdate: new Date(),
    totalDeliveries: 203,
    rating: 4.9
  },
  {
    driverId: 'DRV-004',
    driverName: 'Suresh Deshmukh',
    phone: '+91 97654 32109',
    truckId: 'TRK-04',
    truckNumber: 'MH 13 GH 3456',
    status: 'Returning',
    currentLocation: 'Returning to Pune Hub',
    currentRoute: {
      from: 'AgroVia Fresh Mart',
      to: 'Pune Hub',
      progress: 80,
      eta: '20 mins'
    },
    lastUpdate: new Date(),
    totalDeliveries: 156,
    rating: 4.7
  },
  {
    driverId: 'DRV-005',
    driverName: 'Vikram Singh',
    phone: '+91 98765 54321',
    truckId: 'TRK-05',
    truckNumber: 'MH 16 GH 7890',
    status: 'On Delivery',
    currentLocation: 'Pune to Satara',
    assignedOrderId: 'ORD-003',
    currentRoute: {
      from: 'Pune Hub',
      to: 'Farm Fresh Mart',
      progress: 45,
      eta: '1.5 hrs'
    },
    lastUpdate: new Date(),
    totalDeliveries: 78,
    rating: 4.5
  },
  {
    driverId: 'DRV-006',
    driverName: 'Arjun Yadav',
    phone: '+91 99887 12345',
    truckId: 'TRK-06',
    truckNumber: 'MH 17 IJ 2345',
    status: 'Maintenance',
    currentLocation: 'Service Center',
    lastUpdate: new Date(),
    totalDeliveries: 45,
    rating: 4.3
  },
];

export function pickDefaultAssignment(seed: string): DriverAssignment {
  const idx = Math.abs(
    seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % DEFAULT_DRIVER_ASSIGNMENTS.length;
  return DEFAULT_DRIVER_ASSIGNMENTS[idx];
}


// Warehouse-to-City mapping for routing logic
export const CITY_TO_WAREHOUSE_MAPPING: Record<string, WarehouseId> = {
  'Mumbai': 'mumbai',
  'Pune': 'pune',
  'Satara': 'satara',
  'Andheri': 'mumbai',
  'Thane': 'mumbai',
  'Nashik': 'pune',
  'Kolhapur': 'satara',
  'Sangli': 'satara',
};

/**
 * Determine the nearest warehouse to a retailer based on their address
 */
export function getNearestWarehouse(retailerAddress: string): WarehouseId {
  // Extract city from address
  const address = retailerAddress.toLowerCase();
  
  if (address.includes('mumbai') || address.includes('andheri') || address.includes('thane')) {
    return 'mumbai';
  } else if (address.includes('pune') || address.includes('nashik')) {
    return 'pune';
  } else if (address.includes('satara') || address.includes('kolhapur') || address.includes('sangli')) {
    return 'satara';
  }
  
  // Default to Pune if city not recognized
  return 'pune';
}

/**
 * Create delivery stages for an order
 */
export function createDeliveryStages(
  sourceWarehouseId: WarehouseId,
  destinationWarehouseId: WarehouseId,
  retailerAddress: string
): DeliveryStage[] {
  const stages: DeliveryStage[] = [];
  
  // If source and destination are the same, direct delivery
  if (sourceWarehouseId === destinationWarehouseId) {
    stages.push({
      stage: 1,
      description: 'Direct delivery from warehouse to retailer',
      from: `${sourceWarehouseId.charAt(0).toUpperCase() + sourceWarehouseId.slice(1)} Warehouse`,
      to: retailerAddress,
      status: 'pending'
    });
  } else {
    // Multi-stage delivery: Source → Destination Hub → Retailer
    stages.push({
      stage: 1,
      description: 'Transfer to nearest hub',
      from: `${sourceWarehouseId.charAt(0).toUpperCase() + sourceWarehouseId.slice(1)} Warehouse`,
      to: `${destinationWarehouseId.charAt(0).toUpperCase() + destinationWarehouseId.slice(1)} Hub`,
      status: 'pending'
    });
    
    stages.push({
      stage: 2,
      description: 'Final delivery to retailer',
      from: `${destinationWarehouseId.charAt(0).toUpperCase() + destinationWarehouseId.slice(1)} Hub`,
      to: retailerAddress,
      status: 'pending'
    });
  }
  
  return stages;
}

/**
 * Get available drivers for a specific route
 */
export function getAvailableDriversForRoute(fromWarehouse: WarehouseId): DriverAssignment[] {
  return DEFAULT_DRIVER_ASSIGNMENTS.filter(driver => 
    driver.status === 'Available' || 
    (driver.status === 'Returning' && driver.currentLocation?.toLowerCase().includes(fromWarehouse))
  );
}

/**
 * Assign driver to order stage
 */
export function assignDriverToStage(
  orderId: string,
  stage: DeliveryStage,
  driverId?: string
): DriverAssignment | null {
  let driver: DriverAssignment | null = null;
  
  if (driverId) {
    driver = DEFAULT_DRIVER_ASSIGNMENTS.find(d => d.driverId === driverId) || null;
  } else {
    // Auto-assign based on availability and location
    const availableDrivers = DEFAULT_DRIVER_ASSIGNMENTS.filter(d => d.status === 'Available');
    if (availableDrivers.length > 0) {
      // Pick driver with highest rating
      driver = availableDrivers.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    }
  }
  
  if (driver) {
    // Update driver status
    driver.status = 'On Delivery';
    driver.assignedOrderId = orderId;
    driver.currentRoute = {
      from: stage.from,
      to: stage.to,
      progress: 0,
      eta: '2 hrs' // This would be calculated based on distance
    };
    driver.lastUpdate = new Date();
  }
  
  return driver;
}

import { WarehouseId } from './types';
import { DeliveryStage } from './orderData';