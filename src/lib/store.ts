import { create } from 'zustand';

export interface Product {
    id: string;
    name: string;
    farmer: string;
    batchId: string;
    quantity: number;
    unit: string;
    entryDate: string;
    expiryDate: string;
    status: 'Pending' | 'Graded' | 'Stored' | 'Shipped' | 'Retail';
    grade?: string;
    price?: number;
    image?: string;
    location: string;
    notes?: string;
}

interface InventoryState {
    inventory: Product[];
    addToInventory: (product: Product) => void;
    updateProductStatus: (id: string, status: Product['status'], location?: string) => void;
    consumeProduct: (id: string, amount: number) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
    inventory: [
        {
            id: '1',
            name: 'Tomatoes',
            farmer: 'Rajesh Kumar',
            batchId: 'BATCH-2024-001',
            quantity: 500,
            unit: 'kg',
            entryDate: '2024-03-20',
            expiryDate: '2024-03-27',
            status: 'Stored',
            grade: 'A',
            price: 25,
            location: 'Warehouse A'
        },
        {
            id: '2',
            name: 'Potatoes',
            farmer: 'Suresh Patel',
            batchId: 'BATCH-2024-002',
            quantity: 1200,
            unit: 'kg',
            entryDate: '2024-03-18',
            expiryDate: '2024-04-18',
            status: 'Retail',
            grade: 'B',
            price: 18,
            location: 'Retail Store 1'
        },
        {
            id: '3',
            name: 'Onions',
            farmer: 'Amit Singh',
            batchId: 'BATCH-2024-003',
            quantity: 800,
            unit: 'kg',
            entryDate: '2024-03-21',
            expiryDate: '2024-05-21',
            status: 'Stored',
            grade: 'A',
            price: 30,
            location: 'Warehouse B'
        }
    ],
    addToInventory: (product) => set((state) => ({
        inventory: [...state.inventory, product]
    })),
    updateProductStatus: (id, status, location) => set((state) => ({
        inventory: state.inventory.map((item) =>
            item.id === id
                ? { ...item, status, ...(location && { location }) }
                : item
        )
    })),
    consumeProduct: (id, amount) => set((state) => ({
        inventory: state.inventory.map((item) =>
            item.id === id
                ? { ...item, quantity: Math.max(0, item.quantity - amount) }
                : item
        )
    }))
}));
