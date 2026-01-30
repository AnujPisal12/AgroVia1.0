// Live Logistics System - Starter Implementation
// This provides the foundation for real-time tracking

export interface LiveLocation {
  lat: number;
  lng: number;
  timestamp: Date;
  speed: number; // km/h
  heading: number; // degrees
  accuracy: number; // meters
}

export interface DeliveryStatus {
  orderId: string;
  status: 'dispatched' | 'picked_up' | 'in_transit' | 'nearby' | 'arrived' | 'delivered';
  currentLocation?: LiveLocation;
  estimatedArrival?: Date;
  actualArrival?: Date;
  distanceRemaining?: number; // km
  lastUpdate: Date;
}

export interface DeliveryProof {
  orderId: string;
  photo: string; // Base64 or URL
  signature?: string;
  recipientName: string;
  recipientPhone: string;
  deliveryNotes?: string;
  timestamp: Date;
  location: LiveLocation;
}

export interface RouteInfo {
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  distance: number; // km
  duration: number; // minutes
  polyline?: string; // Encoded polyline for map display
}

// Storage keys
const STORAGE_KEY_DELIVERY_STATUS = 'agrovia_delivery_status';
const STORAGE_KEY_DELIVERY_PROOFS = 'agrovia_delivery_proofs';

// ============================================
// LOCATION TRACKING
// ============================================

/**
 * Get current device location
 */
export const getCurrentLocation = (): Promise<LiveLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date(),
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          accuracy: position.coords.accuracy
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Start watching location (for driver app)
 */
export const startLocationTracking = (
  callback: (location: LiveLocation) => void
): number => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: new Date(),
        speed: position.coords.speed || 0,
        heading: position.coords.heading || 0,
        accuracy: position.coords.accuracy
      });
    },
    (error) => console.error('Location error:', error),
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
};

/**
 * Stop watching location
 */
export const stopLocationTracking = (watchId: number): void => {
  navigator.geolocation.clearWatch(watchId);
};

// ============================================
// DISTANCE & ETA CALCULATIONS
// ============================================

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate ETA based on current location and destination
 */
export const calculateETA = (
  currentLocation: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  averageSpeed: number = 40 // km/h
): { eta: Date; distance: number; duration: number } => {
  const distance = calculateDistance(currentLocation, destination);
  const duration = (distance / averageSpeed) * 60; // minutes
  const eta = new Date(Date.now() + duration * 60 * 1000);

  return { eta, distance, duration };
};

/**
 * Check if location is within geofence radius
 */
export const isWithinGeofence = (
  location: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusKm: number
): boolean => {
  const distance = calculateDistance(location, center);
  return distance <= radiusKm;
};

// ============================================
// DELIVERY STATUS MANAGEMENT
// ============================================

/**
 * Get all delivery statuses
 */
export const getAllDeliveryStatuses = (): DeliveryStatus[] => {
  const stored = localStorage.getItem(STORAGE_KEY_DELIVERY_STATUS);
  if (!stored) return [];
  return JSON.parse(stored).map((s: any) => ({
    ...s,
    lastUpdate: new Date(s.lastUpdate),
    estimatedArrival: s.estimatedArrival ? new Date(s.estimatedArrival) : undefined,
    actualArrival: s.actualArrival ? new Date(s.actualArrival) : undefined,
    currentLocation: s.currentLocation ? {
      ...s.currentLocation,
      timestamp: new Date(s.currentLocation.timestamp)
    } : undefined
  }));
};

/**
 * Get delivery status for specific order
 */
export const getDeliveryStatus = (orderId: string): DeliveryStatus | undefined => {
  return getAllDeliveryStatuses().find(s => s.orderId === orderId);
};

/**
 * Update delivery status
 */
export const updateDeliveryStatus = (status: DeliveryStatus): void => {
  const statuses = getAllDeliveryStatuses();
  const index = statuses.findIndex(s => s.orderId === status.orderId);
  
  if (index >= 0) {
    statuses[index] = { ...status, lastUpdate: new Date() };
  } else {
    statuses.push({ ...status, lastUpdate: new Date() });
  }
  
  localStorage.setItem(STORAGE_KEY_DELIVERY_STATUS, JSON.stringify(statuses));
};

/**
 * Update location for order
 */
export const updateOrderLocation = (
  orderId: string,
  location: LiveLocation,
  destination: { lat: number; lng: number }
): void => {
  const status = getDeliveryStatus(orderId);
  const { eta, distance } = calculateETA(location, destination);
  
  // Determine status based on distance
  let newStatus: DeliveryStatus['status'] = 'in_transit';
  if (distance < 0.5) {
    newStatus = 'arrived';
  } else if (distance < 2) {
    newStatus = 'nearby';
  }

  updateDeliveryStatus({
    orderId,
    status: newStatus,
    currentLocation: location,
    estimatedArrival: eta,
    distanceRemaining: distance,
    lastUpdate: new Date(),
    ...(status || {})
  });
};

// ============================================
// DELIVERY PROOF
// ============================================

/**
 * Get all delivery proofs
 */
export const getAllDeliveryProofs = (): DeliveryProof[] => {
  const stored = localStorage.getItem(STORAGE_KEY_DELIVERY_PROOFS);
  if (!stored) return [];
  return JSON.parse(stored).map((p: any) => ({
    ...p,
    timestamp: new Date(p.timestamp),
    location: {
      ...p.location,
      timestamp: new Date(p.location.timestamp)
    }
  }));
};

/**
 * Get delivery proof for order
 */
export const getDeliveryProof = (orderId: string): DeliveryProof | undefined => {
  return getAllDeliveryProofs().find(p => p.orderId === orderId);
};

/**
 * Save delivery proof
 */
export const saveDeliveryProof = (proof: DeliveryProof): void => {
  const proofs = getAllDeliveryProofs();
  proofs.push(proof);
  localStorage.setItem(STORAGE_KEY_DELIVERY_PROOFS, JSON.stringify(proofs));
  
  // Update delivery status to delivered
  updateDeliveryStatus({
    orderId: proof.orderId,
    status: 'delivered',
    actualArrival: proof.timestamp,
    lastUpdate: new Date()
  });
};

// ============================================
// ROUTE INFORMATION
// ============================================

/**
 * Get route information (simplified without external API)
 */
export const getRouteInfo = (
  origin: { lat: number; lng: number; address: string },
  destination: { lat: number; lng: number; address: string }
): RouteInfo => {
  const distance = calculateDistance(origin, destination);
  const duration = (distance / 40) * 60; // Assuming 40 km/h average

  return {
    origin,
    destination,
    distance,
    duration
  };
};

// ============================================
// NOTIFICATIONS (Browser API)
// ============================================

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show browser notification
 */
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.png',
      badge: '/favicon.png',
      ...options
    });
  }
};

/**
 * Notify when driver is nearby
 */
export const notifyDriverNearby = (orderId: string, driverName: string, eta: number): void => {
  showNotification('🚚 Driver Nearby', {
    body: `${driverName} will arrive in ${Math.round(eta)} minutes`,
    tag: `delivery-${orderId}`,
    requireInteraction: true
  });
};

/**
 * Notify when delivery is complete
 */
export const notifyDeliveryComplete = (orderId: string): void => {
  showNotification('✅ Delivery Complete', {
    body: `Order ${orderId} has been delivered successfully`,
    tag: `delivery-${orderId}`
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format ETA for display
 */
export const formatETA = (eta: Date): string => {
  const now = new Date();
  const diff = eta.getTime() - now.getTime();
  const minutes = Math.round(diff / (1000 * 60));

  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

/**
 * Format distance for display
 */
export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

/**
 * Get status color
 */
export const getStatusColor = (status: DeliveryStatus['status']): string => {
  const colors = {
    dispatched: 'bg-blue-500',
    picked_up: 'bg-indigo-500',
    in_transit: 'bg-purple-500',
    nearby: 'bg-orange-500',
    arrived: 'bg-yellow-500',
    delivered: 'bg-green-500'
  };
  return colors[status] || 'bg-gray-500';
};

/**
 * Get status label
 */
export const getStatusLabel = (status: DeliveryStatus['status']): string => {
  const labels = {
    dispatched: 'Dispatched',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    nearby: 'Nearby',
    arrived: 'Arrived',
    delivered: 'Delivered'
  };
  return labels[status] || 'Unknown';
};
