import { useState, useMemo, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getAllFarmers, addBatch, addFarmer } from '@/lib/mockData';
import { generateBatchId, generateQRId, calculateExpiryDate, calculateRemainingDays, determineFreshnessStatus, isSaleAllowed } from '@/lib/freshness';
import { Farmer, BatchWithDetails, StorageType, QualityGrade, PRODUCTS, getProductById, WAREHOUSES, WarehouseId, convertKgToCrates, getCrateCapacity } from '@/lib/types';
import { addBatchToWarehouse, validateBatchInWarehouse } from '@/lib/warehouseData';
import { useToast } from '@/hooks/use-toast';
import { Info, Plus, CheckCircle2, Search, ArrowRight, PackagePlus, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { useInventoryStore } from '@/lib/store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SmartButton, SuccessCelebration } from '@/components/ui/loading-states';
import { useMediaQuery } from '@/components/ui/mobile-responsive';

export default function FarmerIntake() {
  const { toast } = useToast();
  const farmers = getAllFarmers();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const addToInventory = useInventoryStore((state) => state.addToInventory);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    farmerId: '',
    productId: '',
    quantity: '',
    harvestDate: new Date().toISOString().split('T')[0],
    warehouseId: '' as WarehouseId | '',
    storageType: 'Normal' as StorageType,
    notes: ''
  });

  const [newFarmerName, setNewFarmerName] = useState('');
  const [showNewFarmer, setShowNewFarmer] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<BatchWithDetails | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [farmerInfoOpen, setFarmerInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedProduct = useMemo(() =>
    getProductById(formData.productId),
    [formData.productId]
  );

  const selectedFarmer = useMemo(
    () => farmers.find(f => f.farmerId === formData.farmerId),
    [farmers, formData.farmerId]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearch) return PRODUCTS;
    return PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productSearch]);

  const productsByCategory = useMemo(() => {
    const categories: Record<string, typeof PRODUCTS> = {};
    filteredProducts.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = [];
      }
      categories[product.category].push(product);
    });
    return categories;
  }, [filteredProducts]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.farmerId && !newFarmerName) {
      toast({
        title: "Farmer Required",
        description: "Please select an existing farmer or add a new one.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Determine Farmer ID
    let farmerId = formData.farmerId;
    if (!farmerId && newFarmerName) {
      toast({
        title: "Add Farmer First",
        description: "Please click 'Add' to register the new farmer before submitting.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      const batchId = generateBatchId();
      const harvestDate = new Date(formData.harvestDate);

      const selectedProduct = PRODUCTS.find(p => p.id === formData.productId);
      const quantityKg = parseFloat(formData.quantity);

      // Convert KG to crates
      const crateCount = convertKgToCrates(quantityKg, formData.productId);

      // Default to grade B until quality testing
      const defaultGrade: QualityGrade = 'B';
      const expiryDate = calculateExpiryDate(harvestDate, defaultGrade, formData.storageType, formData.productId);
      const remainingDays = calculateRemainingDays(expiryDate);
      const status = determineFreshnessStatus(remainingDays);

      const batch: BatchWithDetails = {
        batchId,
        cropType: formData.productId,
        harvestDate,
        farmerId: farmerId,
        quantity: quantityKg,
        qualityGrade: null,
        createdAt: new Date(),
        warehouseId: formData.warehouseId as WarehouseId,
        crateCount,
        status: 'Test Pending',
        farmer: farmers.find(f => f.farmerId === farmerId),
        warehouse: WAREHOUSES.find(w => w.id === formData.warehouseId),
        storage: {
          batchId,
          storageType: formData.storageType,
          entryDate: new Date(),
          expectedShelfLife: expiryDate.getTime() - harvestDate.getTime(),
          expiryDate,
        },
        retailStatus: {
          batchId,
          sellByDate: expiryDate,
          remainingDays,
          status,
          saleAllowed: isSaleAllowed(status),
        },
        qrMapping: {
          qrId: generateQRId(),
          batchId,
          publicUrl: `${window.location.origin}/scan/${batchId}`,
        },
        image: imagePreview || undefined,
        notes: formData.notes,
      };

      addBatch(batch);
      const warehouseAdded = addBatchToWarehouse(batchId, formData.warehouseId as WarehouseId, crateCount);

      if (!warehouseAdded) {
        throw new Error('Failed to add batch to warehouse');
      }

      setCreatedBatch(batch);
      setShowSuccess(true);

      const warehouseName = WAREHOUSES.find(w => w.id === formData.warehouseId)?.name || 'Warehouse';
      toast({
        title: 'Batch Registered Successfully!',
        description: `Stock successfully added to ${warehouseName} inventory. ${crateCount} crates assigned.`,
      });

      // Add to global inventory store
      addToInventory({
        id: batch.batchId,
        name: selectedProduct?.name || batch.cropType,
        farmer: batch.farmer?.name || 'Unknown',
        batchId: batch.batchId,
        quantity: batch.quantity,
        unit: selectedProduct?.unit || 'kg',
        entryDate: batch.harvestDate.toISOString().split('T')[0],
        expiryDate: batch.retailStatus.sellByDate.toISOString().split('T')[0],
        status: batch.status,
        image: batch.image,
        location: batch.warehouse?.location || 'Unknown',
        notes: batch.notes,
      });

      sonnerToast.success("Crop Registered Successfully", {
        description: `Batch ${batchId} created and sent for Quality Grading.`
      });

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add batch to warehouse inventory';
      toast({
        title: 'Error Adding to Warehouse',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFarmer = () => {
    if (!newFarmerName.trim()) return;

    const farmerId = `F${(farmers.length + 1).toString().padStart(3, '0')}`;
    const farmerCode = `FRM-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const newFarmer: Farmer = {
      farmerId,
      farmerCode,
      name: newFarmerName.trim(),
    };

    addFarmer(newFarmer);
    setFormData({ ...formData, farmerId });
    setNewFarmerName('');
    setShowNewFarmer(false);

    toast({
      title: 'Farmer Added',
      description: `${newFarmerName} has been registered.`,
    });
  };

  const resetForm = () => {
    setFormData({
      farmerId: '',
      productId: '',
      quantity: '',
      harvestDate: new Date().toISOString().split('T')[0],
      warehouseId: '',
      storageType: 'Normal',
      notes: ''
    });
    setCreatedBatch(null);
    setImagePreview(null);
  };

  if (createdBatch) {
    const product = getProductById(createdBatch.cropType) ||
      { id: createdBatch.cropType, name: createdBatch.cropType, emoji: '', category: 'Vegetable' as const, unit: 'kg' };

    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
          <Card className="glass-card border-2 border-fresh/50 shadow-2xl">
            <CardHeader className="text-center pb-8 border-b border-border/50">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-fresh to-fresh/80 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-fresh/20 animate-in bounce-in duration-700">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fresh to-primary">Batch Created Successfully!</CardTitle>
              <CardDescription className="text-lg">
                The batch has been registered and is ready for quality testing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Batch ID</p>
                <div className="inline-block px-6 py-2 bg-secondary/50 rounded-xl border border-secondary">
                  <p className="text-3xl font-mono font-bold tracking-wider text-primary">{createdBatch.batchId}</p>
                </div>
              </div>

              <div className="flex justify-center p-6 bg-white rounded-2xl shadow-inner border border-border/50 w-fit mx-auto">
                <QRCodeSVG
                  value={`${window.location.origin}/scan/${createdBatch.batchId}`}
                  size={180}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors">
                  <p className="text-muted-foreground mb-1">Product</p>
                  <p className="font-semibold text-lg">{product.name}</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors">
                  <p className="text-muted-foreground mb-1">Quantity</p>
                  <p className="font-semibold text-lg">{createdBatch.quantity} {product.unit}</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors">
                  <p className="text-muted-foreground mb-1">Storage Type</p>
                  <p className="font-semibold text-lg">{createdBatch.storage?.storageType}</p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-colors">
                  <p className="text-muted-foreground mb-1">Status</p>
                  <p className="font-semibold text-lg text-warning flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    {createdBatch.status || 'Test Pending'}
                  </p>
                </div>
              </div>

              {createdBatch.warehouse && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Warehouse Assignment</p>
                  <p className="font-semibold text-lg text-primary">{createdBatch.warehouse.name}</p>
                  <p className="text-sm text-muted-foreground">{createdBatch.warehouse.location}</p>
                  <div className="mt-3 pt-3 border-t border-primary/10 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Crates Assigned:</span>
                    <span className="font-bold text-primary text-lg">{createdBatch.crateCount || 0} crates</span>
                  </div>
                </div>
              )}

              {createdBatch.image && (
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Batch Image</p>
                  <img src={createdBatch.image} alt="Batch" className="w-full h-48 object-cover rounded-lg" />
                </div>
              )}

              {createdBatch.notes && (
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase mb-2 font-semibold">Notes</p>
                  <p className="text-sm text-foreground">{createdBatch.notes}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button onClick={resetForm} variant="outline" className="flex-1 h-12 text-base rounded-xl">
                  Register Another
                </Button>
                <Link to="/grading" className="flex-1">
                  <Button className="w-full h-12 text-base rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                    Proceed to Quality Testing <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 ring-1 ring-primary/20">
            <PackagePlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Farmer Intake</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Register new harvests and generate traceable batch IDs
          </p>
        </div>

        <Card className="glass-card shadow-xl overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">New Harvest Registration</CardTitle>
            <CardDescription>
              Enter harvest details to generate a secure tracking QR code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Product Selection */}
              <div className="space-y-3">
                <Label htmlFor="product" className="text-base font-medium">Product Selection</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => setFormData({ ...formData, productId: value })}
                >
                  <SelectTrigger className="w-full h-12 rounded-xl border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-sm focus:ring-2 ring-primary/20 transition-all hover:bg-white/80 dark:hover:bg-black/40">
                    <SelectValue placeholder="Select a product">
                      {selectedProduct && (
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{selectedProduct.emoji}</span>
                          <span className="font-medium">{selectedProduct.name}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] glass">
                    <div className="px-2 py-2 sticky top-0 bg-popover/80 backdrop-blur-md z-10 border-b mb-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-9 h-10 rounded-lg bg-secondary/50 border-0"
                        />
                      </div>
                    </div>
                    {Object.entries(productsByCategory).map(([category, products]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-bold text-primary px-4 py-2 mt-2 bg-primary/5 rounded-md mx-2">
                          {category}
                        </SelectLabel>
                        {products.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={product.id}
                            className="cursor-pointer py-3 px-4 focus:bg-primary/10 rounded-lg mx-2 my-0.5"
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-xl">{product.emoji}</span>
                              <span className="font-medium">{product.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto bg-secondary px-2 py-1 rounded-md">
                                per {product.unit}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Farmer Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="farmer" className="text-base font-medium">Farmer Details</Label>
                  <Dialog open={farmerInfoOpen} onOpenChange={setFarmerInfoOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        disabled={!selectedFarmer}
                        title={selectedFarmer ? 'Farmer info' : 'Select a farmer to view info'}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Farmer Information</DialogTitle>
                        <DialogDescription>
                          Details for the selected farmer.
                        </DialogDescription>
                      </DialogHeader>
                      {selectedFarmer ? (
                        <div className="space-y-3 text-sm">
                          <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Name</p>
                            <p className="font-semibold text-base">{selectedFarmer.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                              <p className="text-xs text-muted-foreground uppercase mb-1">Farmer ID</p>
                              <p className="font-mono font-bold">{selectedFarmer.farmerId}</p>
                            </div>
                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                              <p className="text-xs text-muted-foreground uppercase mb-1">Farmer Code</p>
                              <p className="font-mono font-bold">{selectedFarmer.farmerCode}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Select a farmer to view details.</div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
                {!showNewFarmer ? (
                  <div className="flex gap-3">
                    <Select
                      value={formData.farmerId}
                      onValueChange={(value) => setFormData({ ...formData, farmerId: value })}
                    >
                      <SelectTrigger className="flex-1 h-12 rounded-xl border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-sm hover:bg-white/80">
                        <SelectValue placeholder="Select registered farmer" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        {farmers.map((farmer) => (
                          <SelectItem key={farmer.farmerId} value={farmer.farmerId} className="py-2.5">
                            <span className="font-medium">{farmer.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">({farmer.farmerCode})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewFarmer(true)}
                      className="h-12 w-12 rounded-xl border-dashed border-2 hover:border-solid hover:bg-secondary"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <Input
                      placeholder="Enter farmer name"
                      value={newFarmerName}
                      onChange={(e) => setNewFarmerName(e.target.value)}
                      className="h-12 rounded-xl bg-white/50 dark:bg-black/20"
                    />
                    <Button type="button" onClick={handleAddFarmer} className="h-12 rounded-xl px-6">Add</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowNewFarmer(false)}
                      className="h-12 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Harvest Date */}
              <div className="space-y-3">
                <Label htmlFor="harvestDate" className="text-base font-medium">
                  Harvest Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={formData.harvestDate}
                  onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-12 rounded-xl bg-white/50 dark:bg-black/20 text-lg font-medium"
                  required
                />
              </div>

              {/* Warehouse Selection */}
              <div className="space-y-3">
                <Label htmlFor="warehouse" className="text-base font-medium">
                  Target Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.warehouseId}
                  onValueChange={(value) => setFormData({ ...formData, warehouseId: value as WarehouseId })}
                  required
                >
                  <SelectTrigger className="h-12 rounded-xl bg-white/50 dark:bg-black/20">
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    {WAREHOUSES.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{warehouse.name}</span>
                          <span className="text-xs text-muted-foreground">{warehouse.location}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Quantity */}
                <div className="space-y-3">
                  <Label htmlFor="quantity" className="text-base font-medium">
                    Quantity (kg) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      step="0.1"
                      placeholder="0.00"
                      value={formData.quantity}
                      onChange={(e) => {
                        const kg = e.target.value;
                        setFormData({ ...formData, quantity: kg });
                      }}
                      className="h-12 rounded-xl pl-4 pr-12 bg-white/50 dark:bg-black/20 text-lg font-medium"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                      kg
                    </div>
                  </div>
                  {formData.quantity && formData.productId && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {convertKgToCrates(parseFloat(formData.quantity) || 0, formData.productId)} crates
                      ({getCrateCapacity(formData.productId)} kg per crate)
                    </p>
                  )}
                </div>

                {/* Storage Type */}
                <div className="space-y-3">
                  <Label htmlFor="storage" className="text-base font-medium">Storage Method</Label>
                  <Select
                    value={formData.storageType}
                    onValueChange={(value: StorageType) => setFormData({ ...formData, storageType: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-white/50 dark:bg-black/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="Normal" className="py-3">
                        <span className="font-medium">Normal Storage</span>
                      </SelectItem>
                      <SelectItem value="Cold" className="py-3">
                        <span className="font-medium text-fresh flex items-center gap-2">
                          Cold Storage <span className="text-xs bg-fresh/10 px-2 py-0.5 rounded-full">+40% Life</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-3">
                <Label htmlFor="image" className="text-base font-medium">Batch Image (Optional)</Label>
                <div
                  className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:bg-secondary/20 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-48">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <PackagePlus className="h-8 w-8 opacity-50" />
                      <p>Click to upload or drag and drop</p>
                      <p className="text-xs">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-base font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific observations..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-[100px] rounded-xl bg-white/50 dark:bg-black/20"
                />
              </div>

              <SmartButton
                type="submit"
                className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                disabled={!formData.productId}
                isLoading={isSubmitting}
                loadingText="Creating Batch..."
                successText="Batch Created!"
                icon={<PackagePlus className="h-5 w-5" />}
              >
                Generate Batch ID
                <ArrowRight className="ml-2 h-5 w-5" />
              </SmartButton>
            </form>
          </CardContent>
        </Card>

        <SuccessCelebration
          show={showSuccess}
          title="Batch Created Successfully!"
          description="Your harvest has been registered and is ready for quality testing."
          onClose={() => setShowSuccess(false)}
          actions={[
            {
              label: "View Batch",
              onClick: () => {
                setShowSuccess(false);
                // Navigate to batch details or quality grading
              }
            },
            {
              label: "Register Another",
              onClick: () => {
                setShowSuccess(false);
                resetForm();
              },
              variant: "outline"
            }
          ]}
        />
      </div>
    </Layout>
  );
}
