import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QRScanner } from '@/components/QRScanner';
import { getAllBatches, getBatchById } from '@/lib/mockData';
import {
  Crate,
  Order,
  getAllCrates,
  getAllOrders,
  addCrate,
  updateOrderStatus,
  generateCrateId,
  updateOrder
} from '@/lib/orderData';
import { StatusBadge } from '@/components/StatusBadge';
import { getProductById, WAREHOUSES, WarehouseId, convertCratesToKg, getCrateCapacity, getProductPrice, QualityGrade } from '@/lib/types';
import { getWarehouseInventory, getWarehouseCapacity, getAllWarehouses } from '@/lib/warehouseData';
import { addRetailerInventory } from '@/lib/retailerInventory';
import { Badge } from '@/components/ui/badge';
import { PrintLabel } from '@/components/PrintLabel';
import { exportBatchesToCSV } from '@/lib/exportData';
import {
  Warehouse as WarehouseIcon,
  Search,
  AlertTriangle,
  Bell,
  Package,
  Plus,
  CheckCircle2,
  Download,
  BoxIcon,
  Filter,
  ArrowRight,
  Truck,
  MapPin,
  Thermometer,
  Droplets,
  Activity,
  Wifi,
  Scan,
  User,
  Users,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useInventoryStore } from '@/lib/store';
import { getRetailerStoreById, pickDefaultAssignment, DEFAULT_DRIVER_ASSIGNMENTS } from '@/lib/retailers';
import { getWarehouseInsights } from '@/lib/warehouseAi';

export default function WarehouseDashboard() {
  // Removed globalInventory and conflicting state to unify on mockData source
  const [filterWarehouseId, setFilterWarehouseId] = useState<WarehouseId | 'all'>('all');

  // Show all batches in warehouse (including Test Pending - they're in warehouse but awaiting quality test)
  const [batches, setBatches] = useState(() => getAllBatches().filter(b => {
    if (!b.warehouseId) return false;
    // Include batches that are in warehouse regardless of status
    return b.status === 'Test Pending' || b.status === 'Tested' || b.status === 'Stored';
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Fresh' | 'Consume Soon' | 'Expired'>('all');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(getAllOrders());
  const [crates, setCrates] = useState<Crate[]>(getAllCrates());

  // Create crate form
  const [crateBatchId, setCrateBatchId] = useState('');
  const [crateQuantity, setCrateQuantity] = useState('');

  // Refresh batches and crates when component updates
  useEffect(() => {
    const refreshData = () => {
      const updatedBatches = getAllBatches().filter(b => {
        if (!b.warehouseId) return false; // Must have warehouse
        // Include all batches in warehouse (Test Pending, Tested, Stored)
        if (b.status !== 'Test Pending' && b.status !== 'Tested' && b.status !== 'Stored') return false;
        if (filterWarehouseId !== 'all' && b.warehouseId !== filterWarehouseId) return false;
        return true;
      });
      setBatches(updatedBatches);
      // Also refresh selected batch if it exists
      if (selectedBatch) {
        const updated = updatedBatches.find(b => b.batchId === selectedBatch);
        if (!updated) setSelectedBatch(null);
      }
      setCrates(getAllCrates());
      setOrders(getAllOrders());
    };
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [filterWarehouseId]);

  // IoT Map State
  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [fulfillOrderId, setFulfillOrderId] = useState<string | null>(null);
  const [isFulfilling, setIsFulfilling] = useState(false);

  const filteredBatches = useMemo(() => batches
    .filter(b => {
      if (filter !== 'all' && b.retailStatus?.status !== filter) return false;
      if (searchQuery && !b.batchId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (a.retailStatus?.remainingDays || 0) - (b.retailStatus?.remainingDays || 0)), [batches, filter, searchQuery]);

  // ... (stats calculations remain same) 
  const freshCount = batches.filter(b => b.retailStatus?.status === 'Fresh').length;
  const consumeSoonCount = batches.filter(b => b.retailStatus?.status === 'Consume Soon').length;
  const expiredCount = batches.filter(b => b.retailStatus?.status === 'Expired').length;
  const totalCrates = batches.reduce((sum, b) => sum + (b.crateCount || 0), 0);
  // Only show notification for batches that are actually pending testing (status is Test Pending AND no qualityGrade)
  const testPendingCount = batches.filter(b => b.status === 'Test Pending' && !b.qualityGrade).length;

  const warehouseStats = useMemo(() => {
    return WAREHOUSES.map(wh => {
      const capacity = getWarehouseCapacity(wh.id);
      const inventory = getWarehouseInventory(wh.id);
      return {
        ...wh,
        ...capacity,
        batchCount: inventory.length
      };
    });
  }, []);

  const notifications = batches
    .filter(b => b.retailStatus && b.retailStatus.remainingDays <= 3 && b.retailStatus.remainingDays > 0)
    .map(b => ({
      batch: b,
      type: b.retailStatus!.remainingDays <= 1 ? 'urgent' : 'warning',
      message: b.retailStatus!.remainingDays <= 1
        ? `URGENT: ${b.batchId} expires tomorrow!`
        : `Warning: ${b.batchId} expires in ${b.retailStatus!.remainingDays} days`
    }));

  const selected = selectedBatch ? batches.find(b => b.batchId === selectedBatch) : null;
  const pendingOrders = orders.filter(o => o.status === 'Pending');

  // ... (IoT data and handlers remain same)
  // Re-declare variables needed for the snippet context if strict  // Simulated IoT Data with Animation
  const [trucks, setTrucks] = useState([
    { id: 1, route: 'Farm A → Central Warehouse', status: 'In Transit', progress: 65, temp: 4.2, humidity: 58, eta: '2 hrs', speed: 0.2 },
    { id: 2, route: 'Farm C → Central Warehouse', status: 'In Transit', progress: 30, temp: 3.8, humidity: 60, eta: '5 hrs', speed: 0.15 },
    { id: 3, route: 'Central Warehouse → City Retail', status: 'Arriving', progress: 90, temp: 5.1, humidity: 55, eta: '15 mins', speed: 0.25 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrucks(currentTrucks =>
        currentTrucks.map(truck => ({
          ...truck,
          progress: (truck.progress + truck.speed) % 100
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);
  const tempData = [
    { val: 4.0 }, { val: 4.2 }, { val: 3.9 }, { val: 4.1 }, { val: 4.3 }, { val: 4.2 }, { val: 4.0 }, { val: 4.1 }
  ];

  const handleCreateCrate = () => {
    if (!crateBatchId || !crateQuantity) {
      toast.error('Please fill all fields');
      return;
    }

    const batch = getBatchById(crateBatchId.toUpperCase());
    if (!batch) {
      toast.error('Batch not found');
      return;
    }

    const crate: Crate = {
      crateId: generateCrateId(),
      batchId: crateBatchId.toUpperCase(),
      warehouseId: batch.warehouseId,
      quantity: parseInt(crateQuantity),
      createdAt: new Date(),
      status: 'Stored',
    };

    addCrate(crate);
    setCrates([...crates, crate]);
    toast.success(`Crate ${crate.crateId} created`);
    setCrateBatchId('');
    setCrateQuantity('');
  };

  const handleFulfillOrder = async (orderId: string) => {
    setIsFulfilling(true);
    updateOrderStatus(orderId, 'Processing');
    setOrders(orders.map(o => o.orderId === orderId ? { ...o, status: 'Processing' as const } : o));
    toast.success('Order will be fulfilled shortly...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const order = orders.find(o => o.orderId === orderId);
    const fulfillmentDate = new Date();
    const store = order ? getRetailerStoreById(order.retailerId) : undefined;
    const assignment = order ? pickDefaultAssignment(order.orderId) : null;

    updateOrder(orderId, {
      status: 'Fulfilled',
      fulfillmentDate,
      retailerStoreName: order?.retailerStoreName || store?.storeName,
      retailerPhone: order?.retailerPhone || store?.phone,
      retailerAddress: order?.retailerAddress || store?.address,
      assignedDriverName: assignment?.driverName,
      assignedDriverPhone: assignment?.phone,
      assignedTruckNumber: assignment?.truckNumber,
    });

    setOrders(orders.map(o => o.orderId === orderId ? {
      ...o,
      status: 'Fulfilled' as const,
      fulfillmentDate,
      retailerStoreName: o.retailerStoreName || store?.storeName,
      retailerPhone: o.retailerPhone || store?.phone,
      retailerAddress: o.retailerAddress || store?.address,
      assignedDriverName: assignment?.driverName,
      assignedDriverPhone: assignment?.phone,
      assignedTruckNumber: assignment?.truckNumber,
    } : o));
    if (order) {
      const batch = getBatchById(order.batchId);
      if (batch) {
        // FIFO pick crates for this batch and warehouse
        const allCrates = getAllCrates();
        const eligibleCrates = allCrates
          .filter(
            (c) =>
              c.batchId === order.batchId &&
              c.warehouseId === batch.warehouseId &&
              (c.status === 'Stored' || !c.status)
          )
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        const capacityPerCrate = getCrateCapacity(batch.cropType);
        const requiredKg = convertCratesToKg(order.quantity, batch.cropType);
        let pickedKg = 0;
        const updatedCrates: Crate[] = [];

        for (const c of eligibleCrates) {
          if (pickedKg >= requiredKg) break;
          pickedKg += c.quantity;
          updatedCrates.push({
            ...c,
            status: 'In Transit',
            assignedToOrderId: order.orderId,
          });
        }

        if (pickedKg < requiredKg) {
          toast.error(
            `Insufficient crate stock for FIFO. Needed ≈${requiredKg}kg, found ≈${pickedKg}kg`
          );
          setIsFulfilling(false);
          return;
        }

        // Persist updated crates
        const remaining = allCrates.filter(
          (c) => !updatedCrates.find((u) => u.crateId === c.crateId)
        );
        localStorage.setItem(
          'agrovia_crates',
          JSON.stringify([...remaining, ...updatedCrates])
        );

        // Maintain legacy crateCount on batch for capacity stats
        const batches = getAllBatches();
        const batchIndex = batches.findIndex((b) => b.batchId === order.batchId);
        if (batchIndex !== -1 && batches[batchIndex].crateCount) {
          batches[batchIndex].crateCount = Math.max(
            0,
            (batches[batchIndex].crateCount || 0) - order.quantity
          );
          localStorage.setItem('agrovia_batches', JSON.stringify(batches));
        }

        const quantityKg = convertCratesToKg(order.quantity, batch.cropType);
        const updatedOrder = {
          ...order,
          quantityKg,
          fulfillmentDate,
          retailerStoreName: order.retailerStoreName || store?.storeName,
          retailerPhone: order.retailerPhone || store?.phone,
          retailerAddress: order.retailerAddress || store?.address,
          assignedDriverName: assignment?.driverName,
          assignedDriverPhone: assignment?.phone,
          assignedTruckNumber: assignment?.truckNumber,
        };
        try {
          addRetailerInventory(updatedOrder, batch);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error(`Error adding to retailer inventory: ${message}`);
          setIsFulfilling(false);
          return;
        }
      }
    }
    setFulfillOrderId(null);
    setIsFulfilling(false);
    toast.success(`Order ${orderId} fulfilled successfully! ${order?.quantity || 0} crates added to retailer inventory.`);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <WarehouseIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Warehouse</h1>
              <p className="text-muted-foreground">Inventory & Fulfillment Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => exportBatchesToCSV(batches)} className="rounded-xl h-10">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {notifications.length > 0 && (
              <Button variant="destructive" size="icon" className="rounded-xl h-10 w-10 shadow-lg shadow-destructive/20 animate-pulse">
                <Bell className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Warehouse Selection */}
        <div className="flex gap-3 items-center">
          <Label className="text-sm font-medium whitespace-nowrap">Filter by Warehouse:</Label>
          <Select value={filterWarehouseId} onValueChange={(v) => setFilterWarehouseId(v as WarehouseId | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {WAREHOUSES.map(wh => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warehouse Stats Grid */}
        {filterWarehouseId === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouseStats.map(wh => (
              <Card key={wh.id} className="glass-card p-4 hover:bg-white/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{wh.name}</h3>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-3">{wh.location}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-bold">{wh.used} / {wh.total} crates</span>
                  </div>
                  <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        wh.used / wh.total > 0.8 ? "bg-destructive" : wh.used / wh.total > 0.6 ? "bg-warning" : "bg-fresh"
                      )}
                      style={{ width: `${(wh.used / wh.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{wh.batchCount} batches</span>
                    <span>{wh.available} available</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card p-4 flex flex-col items-center justify-center text-center space-y-1 hover:bg-white/50 transition-colors cursor-pointer">
            <span className="text-3xl font-bold">{batches.length}</span>
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Batches</span>
          </Card>
          <Card className="glass-card p-4 flex flex-col items-center justify-center text-center space-y-1 hover:bg-white/50 transition-colors cursor-pointer border-fresh/30 bg-fresh/5">
            <span className="text-3xl font-bold text-fresh">{freshCount}</span>
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Fresh Stock</span>
          </Card>
          <Card className="glass-card p-4 flex flex-col items-center justify-center text-center space-y-1 hover:bg-white/50 transition-colors cursor-pointer border-warning/30 bg-warning/5">
            <span className="text-3xl font-bold text-warning">{consumeSoonCount}</span>
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Low Shelf Life</span>
          </Card>
          <Card className="glass-card p-4 flex flex-col items-center justify-center text-center space-y-1 hover:bg-white/50 transition-colors cursor-pointer border-primary/20">
            <span className="text-3xl font-bold text-primary">{totalCrates}</span>
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Crates</span>
          </Card>
        </div>

        {/* Pending Tests Alert */}
        {testPendingCount > 0 && (
          <Card className="border-warning/30 bg-warning/5 border-2">
            <CardContent className="p-4 flex items-center gap-4">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <div className="flex-1">
                <p className="font-semibold text-warning">{testPendingCount} batches awaiting quality testing</p>
                <p className="text-sm text-muted-foreground">These batches are in warehouse but cannot be sold until quality tested</p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/grading">Test Now</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/50 rounded-xl p-1">
            <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Current Inventory</TabsTrigger>
            <TabsTrigger value="logistics" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <Wifi className="h-3 w-3" /> Live Logistics
            </TabsTrigger>
            <TabsTrigger value="crates" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Crate Management</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
              Orders
              {pendingOrders.length > 0 && (
                <span className="ml-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center">
                  {pendingOrders.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {/* Filters */}
                <div className="flex gap-2 pb-2 overflow-x-auto">
                  {(['all', 'Fresh', 'Consume Soon', 'Expired'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={filter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(status)}
                      className={cn("rounded-lg", filter === status && status === 'Fresh' ? "bg-fresh hover:bg-fresh/90" : "")}
                    >
                      {status === 'all' ? 'View All' : status}
                    </Button>
                  ))}
                </div>

                {/* Barcode/QR Scanner */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Scan className="h-4 w-4" />
                      Scan Barcode/QR Code
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input
                          placeholder="Scan or type batch ID..."
                          value={scanInput}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            setScanInput(value);
                            // Auto-select batch if found
                            const batch = batches.find(b => b.batchId === value || b.batchId.includes(value));
                            if (batch) {
                              setSelectedBatch(batch.batchId);
                              setScanInput('');
                              toast.success(`Batch ${batch.batchId} found and selected`);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && scanInput) {
                              const batch = batches.find(b => b.batchId === scanInput.toUpperCase() || b.batchId.includes(scanInput.toUpperCase()));
                              if (batch) {
                                setSelectedBatch(batch.batchId);
                                setScanInput('');
                                toast.success(`Batch ${batch.batchId} found and selected`);
                              } else {
                                toast.error('Batch not found');
                              }
                            }
                          }}
                          className="pl-10 h-12 rounded-xl bg-white dark:bg-card border-primary/30 shadow-sm font-mono"
                        />
                      </div>
                      <Button
                        onClick={() => setQrScannerOpen(true)}
                        className="h-12 px-6 rounded-xl shadow-lg"
                        size="lg"
                      >
                        <Scan className="h-5 w-5 mr-2" />
                        Open Camera
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Type batch ID manually or click "Open Camera" to scan QR code
                    </p>
                  </CardContent>
                </Card>

                {/* QR Scanner Modal */}
                <QRScanner
                  open={qrScannerOpen}
                  onClose={() => setQrScannerOpen(false)}
                  onScan={(decodedText) => {
                    // Extract batch ID from scanned QR code
                    // QR codes might contain full URL like: https://agrovia.app/scan/BATCH-001
                    const batchIdMatch = decodedText.match(/([A-Z]+-\d+)/i);
                    const batchId = batchIdMatch ? batchIdMatch[1].toUpperCase() : decodedText.toUpperCase();

                    const batch = batches.find(b => b.batchId === batchId || b.batchId.includes(batchId));
                    if (batch) {
                      setSelectedBatch(batch.batchId);
                      toast.success(`Batch ${batch.batchId} scanned and selected`);
                    } else {
                      toast.error(`Batch not found: ${batchId}`);
                    }
                  }}
                />

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search batches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-white/50 border-0 shadow-sm"
                  />
                </div>

                <Card className="overflow-hidden border-0 bg-transparent shadow-none">
                  <div className="space-y-3">
                    {filteredBatches.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No inventory items found.
                      </div>
                    ) : (
                      filteredBatches.map((item) => {
                        const product = getProductById(item.cropType);
                        return (
                          <div
                            key={item.batchId}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/40 hover:bg-white hover:scale-[1.01] transition-all cursor-pointer shadow-sm"
                            onClick={() => setSelectedBatch(item.batchId)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-xl">
                                {product?.emoji || '📦'}
                              </div>
                              <div>
                                <div className="font-semibold">{product?.name || item.cropType}</div>
                                <div className="text-sm text-muted-foreground">ID: {item.batchId} • {item.farmer?.name || item.farmerId}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="font-bold">{item.quantity} {product?.unit || 'kg'}</div>
                                <div className="text-xs text-muted-foreground">In Stock</div>
                              </div>
                              <div className="text-right">
                                <Badge variant={item.retailStatus?.status === 'Fresh' ? 'default' : 'secondary'} className={item.retailStatus?.status === 'Fresh' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}>
                                  {item.retailStatus?.status || item.status}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.qualityGrade ? `Grade ${item.qualityGrade}` : 'Ungraded'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }))}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                {selected ? (
                  <Card className="glass-card sticky top-24 border-2 shadow-xl animate-in fade-in duration-500">
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto h-20 w-20 bg-gradient-to-br from-secondary to-background rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner">
                        {getProductById(selected.cropType)?.emoji}
                      </div>
                      <CardTitle className="text-xl">{getProductById(selected.cropType)?.name}</CardTitle>
                      <CardDescription className="font-mono text-sm bg-secondary/50 inline-block px-2 py-1 rounded mx-auto">
                        {selected.batchId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex justify-center p-4 bg-white rounded-xl shadow-sm border border-border/10">
                        <QRCodeSVG
                          value={`${window.location.origin}/scan/${selected.batchId}`}
                          size={120}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-secondary/30 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground uppercase">Grade</p>
                          <p className="text-lg font-bold">{selected.qualityGrade}</p>
                        </div>
                        <div className="p-3 bg-secondary/30 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground uppercase">Storage</p>
                          <p className="text-lg font-bold truncate">{selected.storage?.storageType}</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded-lg">
                          <span className="text-muted-foreground">Crates</span>
                          <span className="font-mono font-bold">{selected.crateCount || 0} crates</span>
                        </div>
                        <div className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded-lg">
                          <span className="text-muted-foreground">Est. Shelf Life</span>
                          <span className="font-mono font-bold">{selected.retailStatus?.remainingDays} days</span>
                        </div>
                        {selected.warehouse && (
                          <div className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded-lg">
                            <span className="text-muted-foreground">Warehouse</span>
                            <span className="font-medium">{selected.warehouse.name}</span>
                          </div>
                        )}
                        {selected.farmer && (
                          <div className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded-lg">
                            <span className="text-muted-foreground">Origin</span>
                            <span className="font-medium">{selected.farmer.name}</span>
                          </div>
                        )}
                      </div>

                      {(() => {
                        const insight = getWarehouseInsights(selected);
                        return (
                          <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 space-y-2 text-xs text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">AI Handling Suggestion</span>
                              <Badge
                                variant="outline"
                                className={
                                  insight.label === 'High'
                                    ? 'border-destructive text-destructive'
                                    : insight.label === 'Medium'
                                      ? 'border-warning text-warning'
                                      : ''
                                }
                              >
                                {insight.label} risk ({insight.riskScore})
                              </Badge>
                            </div>
                            <ul className="list-disc pl-4 space-y-1">
                              {insight.recommendations.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                      <PrintLabel batch={selected} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/50 rounded-xl bg-secondary/10 text-muted-foreground">
                    <Search className="h-10 w-10 mb-4 opacity-20" />
                    <p>Select a batch from the list to view full tracking details and AI suggestions</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent >

          {/* Enhanced Live Logistics Tab */}
          <TabsContent value="logistics" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Enhanced Map Section */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-dark overflow-hidden relative h-[500px]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_70%)]" />

                  {/* SVG Map Container with Enhanced Routing */}
                  <svg className="w-full h-full p-8" viewBox="0 0 900 500">
                    {/* Warehouse Connections */}
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
                      </marker>
                    </defs>
                    
                    {/* Inter-warehouse routes */}
                    <path d="M 150 150 L 400 250" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
                    <path d="M 150 350 L 400 250" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
                    <path d="M 400 250 L 650 150" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
                    <path d="M 400 250 L 650 350" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
                    
                    {/* Hub to retailer routes */}
                    <path d="M 650 150 L 800 100" stroke="#10b981" strokeWidth="3" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />
                    <path d="M 650 350 L 800 400" stroke="#10b981" strokeWidth="3" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />

                    {/* Animated Trucks with Enhanced Logic */}
                    {DEFAULT_DRIVER_ASSIGNMENTS.filter(driver => driver.status === 'On Delivery').map((driver, index) => {
                      // Enhanced positioning logic based on route
                      let x = 0, y = 0;
                      const progress = driver.currentRoute?.progress || 0;
                      
                      if (driver.currentRoute?.from.includes('Satara') && driver.currentRoute?.to.includes('Pune')) {
                        // Satara to Pune Hub
                        x = 150 + (250 * (progress / 100));
                        y = 350 - (100 * (progress / 100));
                      } else if (driver.currentRoute?.from.includes('Mumbai') && driver.currentRoute?.to.includes('Green Valley')) {
                        // Mumbai Hub to Retailer
                        x = 650 + (150 * (progress / 100));
                        y = 150 - (50 * (progress / 100));
                      } else if (driver.currentRoute?.from.includes('Pune') && driver.currentRoute?.to.includes('Farm Fresh')) {
                        // Pune Hub to Satara Retailer
                        x = 650 + (150 * (progress / 100));
                        y = 350 + (50 * (progress / 100));
                      } else {
                        // Default positioning
                        x = 400 + (200 * (progress / 100));
                        y = 250;
                      }

                      return (
                        <g
                          key={driver.driverId}
                          className="cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => setSelectedTruck(parseInt(driver.truckId.split('-')[1]))}
                        >
                          <circle cx={x} cy={y} r="18" fill="#10b981" className="animate-pulse" opacity="0.3" />
                          <circle cx={x} cy={y} r="12" fill="#10b981" opacity="0.8" />
                          <image x={x - 12} y={y - 12} width="24" height="24" 
                            href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='1' y='3' width='15' height='13'></rect><polygon points='16 8 20 8 23 11 23 16 16 16 16 8'></polygon><circle cx='5.5' cy='18.5' r='2.5'></circle><circle cx='18.5' cy='18.5' r='2.5'></circle></svg>" />
                          <text x={x} y={y + 35} textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                            {driver.truckNumber.split(' ').pop()}
                          </text>
                        </g>
                      );
                    })}

                    {/* Enhanced Warehouse Nodes */}
                    <g transform="translate(100, 100)">
                      <circle cx="50" cy="50" r="35" fill="#0f172a" stroke="#10b981" strokeWidth="3" />
                      <text x="50" y="45" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">SATARA</text>
                      <text x="50" y="58" textAnchor="middle" fill="#10b981" fontSize="8">Warehouse</text>
                    </g>
                    
                    <g transform="translate(100, 300)">
                      <circle cx="50" cy="50" r="35" fill="#0f172a" stroke="#10b981" strokeWidth="3" />
                      <text x="50" y="45" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">MUMBAI</text>
                      <text x="50" y="58" textAnchor="middle" fill="#10b981" fontSize="8">Warehouse</text>
                    </g>
                    
                    <g transform="translate(350, 200)">
                      <circle cx="50" cy="50" r="45" fill="#0f172a" stroke="#f59e0b" strokeWidth="4" />
                      <text x="50" y="45" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">PUNE</text>
                      <text x="50" y="58" textAnchor="middle" fill="#f59e0b" fontSize="9">Central Hub</text>
                    </g>
                    
                    {/* Retailer Nodes */}
                    <g transform="translate(750, 50)">
                      <rect x="0" y="0" width="80" height="40" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                      <text x="40" y="18" textAnchor="middle" fill="#64748b" fontSize="8">Green Valley</text>
                      <text x="40" y="30" textAnchor="middle" fill="#64748b" fontSize="8">Mumbai</text>
                    </g>
                    
                    <g transform="translate(750, 350)">
                      <rect x="0" y="0" width="80" height="40" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                      <text x="40" y="18" textAnchor="middle" fill="#64748b" fontSize="8">Farm Fresh</text>
                      <text x="40" y="30" textAnchor="middle" fill="#64748b" fontSize="8">Satara</text>
                    </g>
                  </svg>

                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                      <Wifi className="h-4 w-4 text-fresh animate-pulse" /> Live Network Status
                    </h3>
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="text-green-400">● {DEFAULT_DRIVER_ASSIGNMENTS.filter(d => d.status === 'On Delivery').length} Active Deliveries</p>
                      <p className="text-blue-400">● {DEFAULT_DRIVER_ASSIGNMENTS.filter(d => d.status === 'Available').length} Available Drivers</p>
                      <p className="text-yellow-400">● {DEFAULT_DRIVER_ASSIGNMENTS.filter(d => d.status === 'Returning').length} Returning</p>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 text-xs text-white">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Real-time Tracking</span>
                    </div>
                  </div>
                </Card>

                {/* Driver Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DEFAULT_DRIVER_ASSIGNMENTS.filter(driver => driver.status === 'On Delivery').map(driver => (
                    <Card key={driver.driverId} className="glass-card hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{driver.driverName}</p>
                              <p className="text-xs text-muted-foreground">{driver.truckNumber}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            {driver.status}
                          </Badge>
                        </div>
                        
                        {driver.currentRoute && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{driver.currentRoute.from} → {driver.currentRoute.to}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{driver.currentRoute.progress}%</span>
                            </div>
                            
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all duration-1000"
                                style={{ width: `${driver.currentRoute.progress}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">ETA</span>
                              <span className="font-medium text-primary">{driver.currentRoute.eta}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{driver.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{driver.totalDeliveries} deliveries</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Enhanced Driver Details Panel */}
              <div className="space-y-4">
                {selectedTruck ? (
                  <Card className="glass-dark text-white h-fit animate-in slide-in-from-right duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="h-5 w-5 text-fresh" /> 
                            {DEFAULT_DRIVER_ASSIGNMENTS.find(d => parseInt(d.truckId.split('-')[1]) === selectedTruck)?.truckNumber || `Vehicle #${selectedTruck}`}
                          </CardTitle>
                          <CardDescription className="text-gray-400 mt-1">
                            Driver: {DEFAULT_DRIVER_ASSIGNMENTS.find(d => parseInt(d.truckId.split('-')[1]) === selectedTruck)?.driverName || 'Unknown'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="border-fresh text-fresh animate-pulse">Live</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Thermometer className="h-4 w-4" /> Temp
                          </div>
                          <div className="text-2xl font-mono font-bold">4.2°C</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Droplets className="h-4 w-4" /> Humidity
                          </div>
                          <div className="text-2xl font-mono font-bold">58%</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Cold Chain Status
                        </h4>
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-400">Optimal Conditions</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">ETA</span>
                          <span className="font-bold">
                            {DEFAULT_DRIVER_ASSIGNMENTS.find(d => parseInt(d.truckId.split('-')[1]) === selectedTruck)?.currentRoute?.eta || '45 mins'}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-fresh h-full transition-all duration-1000"
                            style={{ 
                              width: `${DEFAULT_DRIVER_ASSIGNMENTS.find(d => parseInt(d.truckId.split('-')[1]) === selectedTruck)?.currentRoute?.progress || 65}%` 
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="glass-dark text-white h-fit flex flex-col items-center justify-center text-center p-8 opacity-50 border-dashed">
                    <MapPin className="h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">Select a vehicle on the map to view real-time details.</p>
                  </Card>
                )}

                {/* All Drivers Status */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Driver Fleet Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {DEFAULT_DRIVER_ASSIGNMENTS.map(driver => (
                        <div key={driver.driverId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              driver.status === 'On Delivery' ? 'bg-green-500 animate-pulse' :
                              driver.status === 'Available' ? 'bg-blue-500' :
                              driver.status === 'Returning' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{driver.driverName}</p>
                              <p className="text-xs text-muted-foreground">{driver.truckNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={`text-xs ${
                              driver.status === 'On Delivery' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                              driver.status === 'Available' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                              driver.status === 'Returning' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                              'bg-red-500/10 text-red-600 border-red-500/20'
                            }`}>
                              {driver.status}
                            </Badge>
                            {driver.currentRoute && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ETA: {driver.currentRoute.eta}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Crates Tab */}
          < TabsContent value="crates" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500" >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Generate Crate ID</CardTitle>
                  <CardDescription>Assign traceable IDs to shipping crates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Batch ID</Label>
                    <Select value={crateBatchId} onValueChange={setCrateBatchId}>
                      <SelectTrigger className="h-12 bg-white/50">
                        <SelectValue placeholder="Choose a batch..." />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            No batches available. Batches appear here after quality testing.
                          </div>
                        ) : (
                          batches.map(batch => {
                            const product = getProductById(batch.cropType);
                            const available = batch.quantity; // Could use getAvailableQuantity if we track sold
                            return (
                              <SelectItem key={batch.batchId} value={batch.batchId}>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{product?.emoji}</span>
                                  <span className="font-medium">{product?.name}</span>
                                  <Badge variant="outline" className="ml-2 font-mono text-xs">{batch.batchId}</Badge>
                                  <span className="text-muted-foreground text-xs ml-2">Grade {batch.qualityGrade} • {available}kg</span>
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity (kg)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0.00"
                        value={crateQuantity}
                        onChange={(e) => setCrateQuantity(e.target.value)}
                        className="pr-12"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                        kg
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleCreateCrate} className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/10">
                    <Plus className="mr-2 h-4 w-4" /> Generate Label
                  </Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 bg-transparent shadow-none">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg">Recent Crates</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="space-y-3">
                    {crates.slice(-5).reverse().map(crate => (
                      <div key={crate.crateId} className="flex items-center p-4 bg-white/60 border border-border/50 rounded-xl shadow-sm">
                        <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center mr-4">
                          <BoxIcon className="h-5 w-5 text-foreground/70" />
                        </div>
                        <div className="flex-1">
                          <p className="font-mono font-bold">{crate.crateId}</p>
                          <p className="text-xs text-muted-foreground">From {crate.batchId}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-lg">{crate.quantity}</span> <span className="text-xs text-muted-foreground">kg</span>
                        </div>
                      </div>
                    ))}
                    {crates.length === 0 && <p className="text-center text-muted-foreground py-10">No crates created yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent >

          {/* Orders Tab */}
          < TabsContent value="orders" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500" >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-l-4 border-l-primary shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Pending Fulfillment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingOrders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed">
                      All caught up! No pending orders.
                    </div>
                  ) : (
                    pendingOrders.map(order => (
                      <div key={order.orderId} className="p-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-mono font-bold text-lg">{order.orderId}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(order.orderDate), 'MMM d, h:mm a')}</p>
                          </div>
                          <Badge
                            variant={order.status === 'Processing' ? 'default' : order.status === 'Fulfilled' ? 'default' : 'outline'}
                            className={order.status === 'Processing' ? 'bg-warning text-warning-foreground animate-pulse' : order.status === 'Fulfilled' ? 'bg-fresh text-fresh-foreground' : ''}
                          >
                            {order.status === 'Processing' ? 'Processing...' : order.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-sm">
                            <p className="text-muted-foreground">Requesting:</p>
                            <p className="font-medium">
                              {order.quantity} crates
                              {order.quantityKg && <span> (≈{order.quantityKg.toFixed(1)}kg)</span>}
                              {' '}from {order.batchId}
                            </p>
                            {order.warehouseId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Warehouse: {WAREHOUSES.find(w => w.id === order.warehouseId)?.name}
                              </p>
                            )}
                            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                              <p>
                                Retailer:{' '}
                                <span className="text-foreground/90 font-medium">
                                  {order.retailerStoreName || getRetailerStoreById(order.retailerId)?.storeName || order.retailerId}
                                </span>
                              </p>
                              {(order.retailerAddress || getRetailerStoreById(order.retailerId)?.address) && (
                                <p className="truncate">
                                  Address: {order.retailerAddress || getRetailerStoreById(order.retailerId)?.address}
                                </p>
                              )}
                              {(order.retailerPhone || getRetailerStoreById(order.retailerId)?.phone) && (
                                <p>
                                  Phone: {order.retailerPhone || getRetailerStoreById(order.retailerId)?.phone}
                                </p>
                              )}
                              {(() => {
                                const batch = getBatchById(order.batchId);
                                if (!batch || !batch.qualityGrade) return null;
                                const qtyKg = convertCratesToKg(order.quantity, batch.cropType);
                                // Use warehouse price (what retailer pays warehouse)
                                const pricePerKg = batch.pricing?.warehousePricePerUnit ??
                                  Math.round((getProductPrice(batch.cropType, batch.qualityGrade as QualityGrade) + 2) * 1.08);
                                const amount = qtyKg * pricePerKg;
                                return (
                                  <p className="text-foreground/90">
                                    Amount: <span className="font-semibold">₹{amount.toFixed(0)}</span> ({qtyKg.toFixed(1)}kg × ₹{pricePerKg}/kg)
                                  </p>
                                );
                              })()}
                              {order.paymentOption && (
                                <p className="text-xs mt-1">
                                  Payment: <span className={cn(
                                    "font-medium",
                                    order.paymentOption === 'Pay Instantly' ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                                  )}>
                                    {order.paymentOption}
                                  </span>
                                  {order.paymentStatus && (
                                    <span className={cn(
                                      "ml-2",
                                      order.paymentStatus === 'Paid' ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                    )}>
                                      ({order.paymentStatus})
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setFulfillOrderId(order.orderId)}
                            className="rounded-lg"
                            disabled={isFulfilling}
                          >
                            Fulfill Order <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-secondary/10 border-0">
                <CardHeader>
                  <CardTitle className="text-lg opacity-70">History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 opacity-80">
                    {orders.filter(o => o.status === 'Fulfilled').slice(0, 5).map(order => (
                      <div key={order.orderId} className="flex justify-between items-center p-3 bg-white/50 rounded-lg border border-border/50">
                        <div>
                          <p className="font-mono text-sm font-medium strike-through text-muted-foreground">{order.orderId}</p>
                          <span className="text-[10px] text-muted-foreground">Fulfilled on {format(new Date(), 'MMM d')}</span>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-fresh" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent >
        </Tabs >

        {/* Fulfillment Confirmation Modal */}
        < AlertDialog open={!!fulfillOrderId
        } onOpenChange={(open) => !open && !isFulfilling && setFulfillOrderId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Order Fulfillment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This will decrement warehouse inventory for order {fulfillOrderId}.
                {fulfillOrderId && (() => {
                  const order = orders.find(o => o.orderId === fulfillOrderId);
                  if (order) {
                    const batch = getBatchById(order.batchId);
                    const store = getRetailerStoreById(order.retailerId);
                    const assignment = pickDefaultAssignment(order.orderId);
                    return batch && (
                      <div className="mt-4 p-3 bg-secondary/50 rounded-lg text-left">
                        <p className="text-sm font-semibold mb-1">Order Details:</p>
                        <p className="text-xs">• Batch: {order.batchId}</p>
                        <p className="text-xs">• Quantity: {order.quantity} crates</p>
                        {order.warehouseId && <p className="text-xs">• Warehouse: {WAREHOUSES.find(w => w.id === order.warehouseId)?.name}</p>}
                        <p className="text-xs">• Retailer: {(order.retailerStoreName || store?.storeName || order.retailerId)}</p>
                        {(order.retailerPhone || store?.phone) && <p className="text-xs">• Phone: {(order.retailerPhone || store?.phone)}</p>}
                        {(order.retailerAddress || store?.address) && <p className="text-xs">• Address: {(order.retailerAddress || store?.address)}</p>}
                        <p className="text-xs">• Assigned Driver: {assignment.driverName} ({assignment.truckNumber})</p>
                        {batch.crateCount && <p className="text-xs text-warning mt-2">• Available: {batch.crateCount} crates</p>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isFulfilling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => fulfillOrderId && handleFulfillOrder(fulfillOrderId)}
                disabled={isFulfilling}
              >
                {isFulfilling ? 'Processing...' : 'Confirm Fulfillment'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog >
      </div >
    </Layout >
  );
}
