import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAllBatches } from '@/lib/mockData';
import { getProductById } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { BatchCard } from '@/components/BatchCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Warehouse as WarehouseIcon, Search, AlertTriangle, Bell, QrCode, Leaf, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { QRScanner } from '@/components/QRScanner';
import { toast } from 'sonner';

export default function Warehouse() {
  const batches = getAllBatches().filter(b => b.qualityGrade !== null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Fresh' | 'Consume Soon' | 'Expired'>('all');
  const [scannerOpen, setScannerOpen] = useState(false);

  const filteredBatches = batches
    .filter(b => {
      if (filter !== 'all' && b.retailStatus?.status !== filter) return false;
      if (searchQuery && !b.batchId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (a.retailStatus?.remainingDays || 0) - (b.retailStatus?.remainingDays || 0));

  const freshCount = batches.filter(b => b.retailStatus?.status === 'Fresh').length;
  const consumeSoonCount = batches.filter(b => b.retailStatus?.status === 'Consume Soon').length;
  const expiredCount = batches.filter(b => b.retailStatus?.status === 'Expired').length;

  // Notifications
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

  const handleQRScan = (decodedText: string) => {
    const batch = batches.find(b => b.batchId === decodedText || b.batchId.includes(decodedText));
    if (batch) {
      setSelectedBatch(batch.batchId);
      setSearchQuery(batch.batchId);
      toast.success(`Batch ${batch.batchId} found!`);
    } else {
      toast.error('Batch not found in warehouse inventory');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-fresh/10 rounded-xl shadow-lg shadow-primary/10">
                <WarehouseIcon className="h-6 w-6 text-primary animate-leaf-sway" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-fresh">Warehouse Dashboard</h1>
                <p className="text-muted-foreground">
                  Monitor agricultural inventory and freshness status across all storage facilities
                </p>
              </div>
            </div>
          </div>

          {/* Notifications Bell */}
          {notifications.length > 0 && (
            <div className="relative">
              <Button variant="outline" size="icon" className="relative agricultural-card hover-lift border-warning/30 bg-warning/5 hover:bg-warning/10">
                <Bell className="h-5 w-5 text-warning animate-harvest-bounce" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-expired to-red-600 text-white text-xs flex items-center justify-center font-bold shadow-lg animate-pulse-glow">
                  {notifications.length}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <Card className="agricultural-card border-2 border-warning/30 bg-gradient-to-br from-warning/5 via-amber-50/30 to-orange-50/20 dark:from-warning/10 dark:via-amber-950/20 dark:to-orange-950/10 shadow-xl shadow-warning/10 animate-in slide-in-from-top-4 duration-500">
            <CardHeader className="pb-3 bg-gradient-to-r from-warning/10 to-amber/10 border-b border-warning/20">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-warning animate-harvest-bounce" />
                </div>
                <div>
                  <span className="text-warning font-bold">Freshness Alerts</span>
                  <p className="text-sm text-warning/80 font-normal">Immediate attention required for optimal quality</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div 
                    key={notif.batch.batchId}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      notif.type === 'urgent' ? 'bg-expired/10 text-expired' : 'bg-warning/10 text-warning-foreground'
                    )}
                  >
                    <span className="font-medium">{notif.message}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSelectedBatch(notif.batch.batchId)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            variant={filter === 'Fresh' ? 'default' : 'outline'}
            className={cn(
              'h-auto py-6 flex-col gap-2 rounded-2xl transition-all duration-300 hover-lift',
              filter === 'Fresh' 
                ? 'bg-gradient-to-br from-fresh to-green-600 hover:from-fresh/90 hover:to-green-600/90 text-white shadow-xl shadow-fresh/25' 
                : 'agricultural-card border-fresh/30 hover:bg-fresh/5 hover:border-fresh/50'
            )}
            onClick={() => setFilter(filter === 'Fresh' ? 'all' : 'Fresh')}
          >
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 animate-leaf-sway" />
              <span className="text-3xl font-bold">{freshCount}</span>
            </div>
            <span className="text-sm font-medium">Farm Fresh</span>
            <span className="text-xs opacity-80">Ready for premium sale</span>
          </Button>
          <Button
            variant={filter === 'Consume Soon' ? 'default' : 'outline'}
            className={cn(
              'h-auto py-6 flex-col gap-2 rounded-2xl transition-all duration-300 hover-lift',
              filter === 'Consume Soon' 
                ? 'bg-gradient-to-br from-warning to-amber-600 hover:from-warning/90 hover:to-amber-600/90 text-white shadow-xl shadow-warning/25'
                : 'harvest-card border-warning/30 hover:bg-warning/5 hover:border-warning/50'
            )}
            onClick={() => setFilter(filter === 'Consume Soon' ? 'all' : 'Consume Soon')}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-harvest-bounce" />
              <span className="text-3xl font-bold">{consumeSoonCount}</span>
            </div>
            <span className="text-sm font-medium">Priority Sale</span>
            <span className="text-xs opacity-80">Sell within 3 days</span>
          </Button>
          <Button
            variant={filter === 'Expired' ? 'default' : 'outline'}
            className={cn(
              'h-auto py-6 flex-col gap-2 rounded-2xl transition-all duration-300 hover-lift',
              filter === 'Expired' 
                ? 'bg-gradient-to-br from-expired to-red-600 hover:from-expired/90 hover:to-red-600/90 text-white shadow-xl shadow-expired/25'
                : 'earth-card border-expired/30 hover:bg-expired/5 hover:border-expired/50'
            )}
            onClick={() => setFilter(filter === 'Expired' ? 'all' : 'Expired')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <span className="text-3xl font-bold">{expiredCount}</span>
            </div>
            <span className="text-sm font-medium">Past Prime</span>
            <span className="text-xs opacity-80">Processing only</span>
          </Button>
        </div>

        {/* Search with QR Scanner */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Batch ID or Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input-agricultural pl-10 h-12 text-base"
            />
          </div>
          <Button
            onClick={() => setScannerOpen(true)}
            className="btn-agricultural gap-2 h-12 px-6 text-base font-semibold"
            size="lg"
          >
            <QrCode className="h-5 w-5" />
            Scan QR Code
          </Button>
        </div>

        {/* QR Scanner Dialog */}
        <QRScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleQRScan}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Batch List */}
          <div className="lg:col-span-2">
            <Card className="agricultural-card shadow-xl border-2 border-green-100 dark:border-green-800/30">
              <CardHeader className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border-b border-green-100 dark:border-green-800/30">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <WarehouseIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-primary">Agricultural Inventory</span>
                    <p className="text-sm text-green-600 dark:text-green-400 font-normal">
                      {filteredBatches.length} batches • {batches.reduce((sum, b) => sum + b.quantity, 0)} kg total
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredBatches.map((batch) => {
                    const product = getProductById(batch.cropType);
                    return (
                      <div
                        key={batch.batchId}
                        onClick={() => setSelectedBatch(batch.batchId)}
                        className={cn(
                          'group flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover-lift',
                          selectedBatch === batch.batchId 
                            ? 'border-primary bg-gradient-to-r from-primary/5 to-fresh/5 shadow-lg shadow-primary/10' 
                            : 'border-green-100 dark:border-green-800/30 bg-white/50 dark:bg-black/20 hover:bg-green-50/50 dark:hover:bg-green-950/20 hover:border-primary/30'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-background flex items-center justify-center text-2xl shadow-inner">
                            {product?.emoji || '📦'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-mono font-bold text-primary">{batch.batchId}</p>
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                Grade {batch.qualityGrade}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="font-medium">{product?.name || batch.cropType}</span>
                              <span>•</span>
                              <span>{batch.quantity} {product?.unit || 'kg'}</span>
                              <span>•</span>
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{batch.storage?.storageType}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">
                              {batch.retailStatus && batch.retailStatus.remainingDays > 0 
                                ? `${batch.retailStatus.remainingDays} days fresh`
                                : 'Past prime'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {batch.retailStatus?.sellByDate ? format(new Date(batch.retailStatus.sellByDate), 'MMM dd') : 'No date'}
                            </p>
                          </div>
                          {batch.retailStatus && (
                            <StatusBadge status={batch.retailStatus.status} size="sm" variant="agricultural" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredBatches.length === 0 && (
                    <div className="text-center py-12 px-4 rounded-2xl border-dashed border-2 border-green-200/50 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/20">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-green-600 dark:text-green-400 opacity-60" />
                      </div>
                      <p className="text-green-700 dark:text-green-300 font-medium mb-2">No batches match your search criteria</p>
                      <p className="text-green-600 dark:text-green-400 text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Details */}
          <div className="lg:col-span-1">
            {selected ? (
              <BatchCard batch={selected} showQR showDetails />
            ) : (
              <Card className="agricultural-card h-full flex items-center justify-center shadow-xl border-2 border-green-100 dark:border-green-800/30">
                <CardContent className="text-center py-12">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <WarehouseIcon className="h-10 w-10 text-green-600 dark:text-green-400 opacity-60" />
                  </div>
                  <p className="text-green-700 dark:text-green-300 font-medium mb-2">
                    Select a batch to view details
                  </p>
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    Click on any inventory item to see comprehensive batch information
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
