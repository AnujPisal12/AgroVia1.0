import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { getAllBatches } from '@/lib/mockData';
import { determineGradeFromVisualAndFirmness, calculateExpiryDate, calculateRemainingDays, determineFreshnessStatus, isSaleAllowed } from '@/lib/freshness';
import { Firmness, QualityGrade, BatchWithDetails, getProductById, getProductPrice, BatchPricing, WarehouseId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, Star, CheckCircle2, AlertCircle, TrendingUp, Thermometer, Camera, Sparkles, Loader2, Scan, RefreshCw, Microscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { computeThreeTierPricing, getModalPriceForWarehouse } from '@/lib/marketPricing';
import { SmartButton, SuccessCelebration } from '@/components/ui/loading-states';
import { useMediaQuery } from '@/components/ui/mobile-responsive';

export default function QualityGrading() {
  const { toast } = useToast();
  const allBatches = getAllBatches();
  const untestedBatches = allBatches.filter(b => b.qualityGrade === null);
  const testedBatches = allBatches.filter(b => b.qualityGrade !== null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [visualQuality, setVisualQuality] = useState([3]);
  const [firmness, setFirmness] = useState<Firmness>('Medium');
  const [gradedBatch, setGradedBatch] = useState<{ batch: BatchWithDetails; grade: QualityGrade } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  // AI Simulator State
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [aiResult, setAiResult] = useState<{ grade: QualityGrade; confidence: number; defects: string[]; batchId?: string; cropType?: string } | null>(null);

  const selectedBatch = untestedBatches.find(b => b.batchId === selectedBatchId);
  const calculatedGrade = determineGradeFromVisualAndFirmness(visualQuality[0], firmness);

  const simulateAiAnalysis = () => {
    if (!selectedBatch) return;
    setIsAnalysing(true);
    setAiResult(null);

    // Mock analysis delay
    setTimeout(() => {
      setIsAnalysing(false);
      const randomScore = Math.random();
      let result = {
        grade: 'A' as QualityGrade,
        confidence: 98,
        defects: [] as string[],
        batchId: selectedBatch.batchId,
        cropType: selectedBatch.cropType
      };

      if (randomScore > 0.6) {
        result = {
          grade: 'A',
          confidence: 96,
          defects: ['None detected'],
          batchId: selectedBatch.batchId,
          cropType: selectedBatch.cropType
        };
      } else if (randomScore > 0.3) {
        result = {
          grade: 'B',
          confidence: 89,
          defects: ['Minor surface blemishes'],
          batchId: selectedBatch.batchId,
          cropType: selectedBatch.cropType
        };
      } else {
        result = {
          grade: 'C',
          confidence: 92,
          defects: ['Visible bruising', 'Size variance'],
          batchId: selectedBatch.batchId,
          cropType: selectedBatch.cropType
        };
      }

      setAiResult(result);

      // Auto-apply logic
      if (result.grade === 'A') {
        setVisualQuality([5]);
        setFirmness('High');
      } else if (result.grade === 'B') {
        setVisualQuality([3]);
        setFirmness('Medium');
      } else {
        setVisualQuality([2]);
        setFirmness('Low');
      }

      toast({
        title: "AI Analysis Complete",
        description: `Detected Grade ${result.grade} with ${result.confidence}% confidence.`,
      });

    }, 2500);
  };

  const handleGrade = async () => {
    if (!selectedBatch) return;

    setIsGrading(true);

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update batch in localStorage
      const batches = getAllBatches();
      const batchIndex = batches.findIndex(b => b.batchId === selectedBatchId);

      if (batchIndex === -1) return;

      const grade = calculatedGrade;
      const storageType = batches[batchIndex].storage?.storageType || 'Normal';
      const harvestDate = new Date(batches[batchIndex].harvestDate);
      const productId = batches[batchIndex].cropType;
      const expiryDate = calculateExpiryDate(harvestDate, grade, storageType, productId);
      const remainingDays = calculateRemainingDays(expiryDate);
      const status = determineFreshnessStatus(remainingDays);

      const updateBatchBase: BatchWithDetails = {
        ...batches[batchIndex],
        qualityGrade: grade,
        status: 'Stored' as const, // Update status: Test Pending → Tested → Stored (now ready for sale)
        qualityTest: {
          testId: `TEST-${selectedBatchId}`,
          batchId: selectedBatchId,
          visualQuality: visualQuality[0],
          freshnessDays: remainingDays,
          firmness,
          finalGrade: grade,
          testDate: new Date(),
        },
        storage: {
          ...batches[batchIndex].storage!,
          expiryDate,
          expectedShelfLife: expiryDate.getTime() - harvestDate.getTime(),
        },
        retailStatus: {
          batchId: selectedBatchId,
          sellByDate: expiryDate,
          remainingDays,
          status,
          saleAllowed: isSaleAllowed(status),
        },
      };

      // Try to attach market-based pricing from CSV
      let pricing: BatchPricing | undefined;
      try {
        const warehouseId = batches[batchIndex].warehouseId as WarehouseId | undefined;
        const info = await getModalPriceForWarehouse(productId, warehouseId);
        if (info) {
          const threeTier = computeThreeTierPricing(info.modalPrice, grade);
          pricing = {
            market: info.market,
            commodity: info.commodity,
            modalPrice: info.modalPrice,
            farmerPayoutPerUnit: threeTier.farmerPayoutPerUnit,
            warehousePricePerUnit: threeTier.warehousePricePerUnit,
            retailerSellingPricePerUnit: threeTier.retailerSellingPricePerUnit,
            csvDate: String(info.dateSerial),
            computedAt: new Date().toISOString(),
            source: 'csv',
          };
        }
      } catch {
        // If CSV pricing fails, we silently fall back to default pricing
      }

      const updateBatch: BatchWithDetails = {
        ...updateBatchBase,
        ...(pricing ? { pricing } : {}),
      };

      batches[batchIndex] = updateBatch;

      localStorage.setItem('agrovia_batches', JSON.stringify(batches));

      const pricePerUnit =
        pricing?.retailerSellingPricePerUnit ?? getProductPrice(productId, grade);
      setGradedBatch({ batch: updateBatch, grade });
      setAiResult(null);
      setShowSuccess(true);

      toast({
        title: 'Quality Test Complete',
        description: `Batch graded as ${grade}. Farmer: Rs.${pricing?.farmerPayoutPerUnit ?? Math.round(pricePerUnit * 0.95)}/${getProductById(productId)?.unit || 'kg'}, Retailer: Rs.${pricePerUnit}/${getProductById(productId)?.unit || 'kg'}`,
      });
    } finally {
      setIsGrading(false);
    }
  };

  const resetForm = () => {
    setSelectedBatchId('');
    setVisualQuality([3]);
    setFirmness('Medium');
    setGradedBatch(null);
    setAiResult(null);
  };

  const gradeColors = {
    A: 'bg-fresh text-fresh-foreground shadow-fresh/25',
    B: 'bg-warning text-warning-foreground shadow-warning/25',
    C: 'bg-expired text-expired-foreground shadow-expired/25',
  };

  const gradeDescription = {
    A: 'Premium Export Quality',
    B: 'Standard Market Quality',
    C: 'Processing / Low Quality',
  };

  if (gradedBatch) {
    const product = getProductById(gradedBatch.batch.cropType);
    const productName = product?.name || gradedBatch.batch.cropType;
    const productUnit = product?.unit || 'kg';
    const pricing = gradedBatch.batch.pricing;
    const fallbackPrice = getProductPrice(gradedBatch.batch.cropType, gradedBatch.grade);
    
    // Calculate 3-tier pricing (use pricing if available, otherwise compute from fallback)
    const farmerPayout = pricing?.farmerPayoutPerUnit ?? Math.round(fallbackPrice * 0.95);
    const warehousePrice = pricing?.warehousePricePerUnit ?? Math.round((fallbackPrice + 2) * 1.08);
    const retailerPrice = pricing?.retailerSellingPricePerUnit ?? Math.round(warehousePrice * 1.15);

    return (
      <Layout>
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
          <Card className="glass-card border-2 border-fresh/50 shadow-2xl">
            <CardHeader className="text-center pb-8 border-b border-border/50">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-fresh to-fresh/80 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-fresh/20 animate-in spin-in-12 duration-1000">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fresh to-primary">Quality Test Complete!</CardTitle>
              <CardDescription className="text-lg">
                {productName} has been graded and priced accordingly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="text-center space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Final Grade Assigned</p>
                <div className={`text-7xl font-black px-12 py-8 rounded-3xl inline-block shadow-2xl ${gradeColors[gradedBatch.grade]} transition-all hover:scale-105`}>
                  {gradedBatch.grade}
                </div>
                <p className="text-xl font-medium text-muted-foreground">{gradeDescription[gradedBatch.grade]}</p>
              </div>

              {/* 3-Tier Pricing Display */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Pricing Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/30 text-center hover:bg-green-500/15 transition-colors">
                    <p className="text-sm text-muted-foreground mb-2">Farmer Payout</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">Rs.{farmerPayout}<span className="text-sm font-normal text-muted-foreground">/{productUnit}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">What farmer receives</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/30 text-center hover:bg-blue-500/15 transition-colors">
                    <p className="text-sm text-muted-foreground mb-2">Warehouse Price</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rs.{warehousePrice}<span className="text-sm font-normal text-muted-foreground">/{productUnit}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Retailer purchase price</p>
                  </div>
                  <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/30 text-center hover:bg-purple-500/15 transition-colors">
                    <p className="text-sm text-muted-foreground mb-2">Retailer Selling Price</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">Rs.{retailerPrice}<span className="text-sm font-normal text-muted-foreground">/{productUnit}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Customer price (includes testing & logistics)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm max-w-lg mx-auto">
                <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 text-center hover:bg-secondary/50 transition-colors">
                  <p className="text-muted-foreground mb-1">Predicted Shelf Life</p>
                  <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    {gradedBatch.batch.retailStatus?.remainingDays} <span className="text-sm font-normal text-muted-foreground">days</span>
                  </p>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Farmer Payout Impact
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Excellent work! Highest quality grading means better prices for farmers.
                  Grade {gradedBatch.grade} earns <span className="font-bold">Rs.{retailerPrice}</span> for customers
                  (vs Rs.{getProductPrice(gradedBatch.batch.cropType, 'C')} for Grade C).
                </p>
              </div>

              <Button onClick={resetForm} className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                Grade Another Batch
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/10 to-fresh/10 rounded-2xl mb-4 ring-1 ring-primary/20 shadow-lg shadow-primary/10">
            <div className="relative">
              <ClipboardCheck className="h-8 w-8 text-primary animate-pulse-glow" />
              <Microscope className="absolute -top-1 -right-1 h-4 w-4 text-fresh animate-bounce" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-fresh to-primary">Quality Grading</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            AI-powered agricultural quality assessment for premium market pricing
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Grading Form */}
          <Card className="agricultural-card shadow-2xl h-fit border-2 border-green-100 dark:border-green-800/30 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border-b border-green-100 dark:border-green-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Microscope className="h-6 w-6 text-primary animate-leaf-sway" />
                </div>
                <div>
                  <CardTitle className="text-xl text-primary">Agricultural Quality Assessment</CardTitle>
                  <CardDescription className="text-green-600 dark:text-green-400">
                    Evaluate visual and physical parameters for premium market grading
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {untestedBatches.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border-dashed border-2 border-green-200/50 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/20">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-green-600 dark:text-green-400 opacity-60" />
                  </div>
                  <p className="text-green-700 dark:text-green-300 font-medium mb-2">No fresh harvests awaiting quality assessment</p>
                  <p className="text-green-600 dark:text-green-400 text-sm mb-4">Register new batches to begin agricultural quality grading</p>
                  <Button variant="outline" asChild className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950/50">
                    <a href="/farmer">Register Fresh Harvest</a>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-primary" />
                      Select Fresh Harvest for Assessment
                    </Label>
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger className="form-select-agricultural h-14 text-base shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Choose a fresh harvest batch..." />
                      </SelectTrigger>
                      <SelectContent className="glass border-green-200 dark:border-green-800">
                        {untestedBatches.map((batch) => {
                          const product = getProductById(batch.cropType);
                          return (
                            <SelectItem key={batch.batchId} value={batch.batchId} className="py-3 hover:bg-green-50 dark:hover:bg-green-950/30">
                              <div className="flex items-center gap-3">
                                <span className="text-xl animate-bounce">{product?.emoji || '🌱'}</span>
                                <div>
                                  <span className="font-medium">{product?.name || batch.cropType}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-muted-foreground text-xs font-mono bg-secondary px-2 py-0.5 rounded-md">{batch.batchId}</span>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{batch.quantity}{product?.unit || 'kg'}</span>
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBatch && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-8">
                      {/* AI Vision Scanner */}
                      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center group">
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                          <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
                        </div>

                        {!aiResult ? (
                          <div className="space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                              {isAnalysing ? (
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                              ) : (
                                <Camera className="h-8 w-8 text-primary" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{isAnalysing ? "Analyzing Produce..." : "AgroVision AI Scan"}</h3>
                              <p className="text-sm text-muted-foreground">
                                {isAnalysing ? "Detecting size, color, and surface defects." : "Upload photo for instant quality grading."}
                              </p>
                            </div>
                            <Button
                              onClick={simulateAiAnalysis}
                              disabled={isAnalysing}
                              className="rounded-full px-8 shadow-lg shadow-primary/20"
                            >
                              {isAnalysing ? "Processing..." : (
                                <><Scan className="mr-2 h-4 w-4" /> Start AI Scan</>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="mx-auto w-16 h-16 rounded-full bg-fresh/10 flex items-center justify-center mb-2 border-2 border-fresh">
                              <CheckCircle2 className="h-8 w-8 text-fresh" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">AI Analysis Complete</h3>
                              <div className="flex justify-center gap-2 text-sm mt-1">
                                <Badge variant="outline" className="bg-white/50">{aiResult.confidence}% Confidence</Badge>
                                <Badge variant="default" className={cn(gradeColors[aiResult.grade])}>Grade {aiResult.grade}</Badge>
                              </div>
                              <div className="grid grid-cols-1 gap-6">
                                {/* Results Card */}
                                <Card className="glass-card shadow-2xl border-primary/20 overflow-hidden relative">
                                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-fresh to-primary animate-gradient" />
                                  <CardHeader className="text-center pb-2">
                                    <div className="mx-auto h-24 w-24 bg-gradient-to-br from-secondary to-background rounded-full flex items-center justify-center text-5xl mb-4 shadow-inner ring-4 ring-background">
                                      {getProductById(aiResult.cropType)?.emoji || '📦'}
                                    </div>
                                    <CardTitle className="text-3xl font-bold">{getProductById(aiResult.cropType)?.name || 'Product'}</CardTitle>
                                    <CardDescription className="text-lg">Batch: {aiResult.batchId || 'N/A'}</CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-8">
                                    {/* Grade & Score */}
                                    <div className="flex justify-center gap-6">
                                      <div className="text-center p-4 bg-secondary/30 rounded-2xl min-w-[120px]">
                                        <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Quality Grade</div>
                                        <div className={`text-4xl font-black ${aiResult.grade === 'A' ? 'text-fresh' :
                                          aiResult.grade === 'B' ? 'text-warning' : 'text-destructive'
                                          }`}>
                                          {aiResult.grade}
                                        </div>
                                      </div>
                                      <div className="text-center p-4 bg-secondary/30 rounded-2xl min-w-[120px]">
                                        <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">AI Confidence</div>
                                        <div className="text-4xl font-black text-primary">
                                          {aiResult.confidence}%
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-3 mt-8">
                                      <Button
                                        className="w-full h-14 text-base font-bold shadow-xl shadow-primary/25 bg-gradient-to-r from-primary to-green-600 hover:scale-[1.02] transition-transform rounded-xl"
                                        onClick={async () => {
                                          if (!selectedBatch) return;

                                          // Determine grade based on AI result
                                          const grade = aiResult.grade;
                                          const product = getProductById(selectedBatch.cropType);
                                          
                                          // Calculate expiry and freshness
                                          const storageType = selectedBatch.storage?.storageType || 'Normal';
                                          const harvestDate = new Date(selectedBatch.harvestDate);
                                          const productId = selectedBatch.cropType;
                                          const expiryDate = calculateExpiryDate(harvestDate, grade, storageType, productId);
                                          const remainingDays = calculateRemainingDays(expiryDate);
                                          const status = determineFreshnessStatus(remainingDays);

                                          // Update batch in localStorage
                                          const batches = getAllBatches();
                                          const batchIndex = batches.findIndex(b => b.batchId === selectedBatch.batchId);
                                          
                                          if (batchIndex === -1) {
                                            toast({
                                              title: 'Error',
                                              description: 'Batch not found',
                                              variant: 'destructive'
                                            });
                                            return;
                                          }

                                          const updateBatchBase: BatchWithDetails = {
                                            ...batches[batchIndex],
                                            qualityGrade: grade,
                                            status: 'Stored' as const,
                                            qualityTest: {
                                              testId: `TEST-${selectedBatch.batchId}`,
                                              batchId: selectedBatch.batchId,
                                              visualQuality: grade === 'A' ? 5 : grade === 'B' ? 3 : 2,
                                              freshnessDays: remainingDays,
                                              firmness: grade === 'A' ? 'High' : grade === 'B' ? 'Medium' : 'Low',
                                              finalGrade: grade,
                                              testDate: new Date(),
                                              performedBy: 'AI System',
                                              notes: `AI Confidence: ${aiResult.confidence}%`
                                            },
                                            storage: {
                                              ...batches[batchIndex].storage!,
                                              expiryDate,
                                              expectedShelfLife: expiryDate.getTime() - harvestDate.getTime(),
                                            },
                                            retailStatus: {
                                              batchId: selectedBatch.batchId,
                                              sellByDate: expiryDate,
                                              remainingDays,
                                              status,
                                              saleAllowed: isSaleAllowed(status),
                                            },
                                          };

                                          // Try to attach market-based pricing
                                          let pricing: BatchPricing | undefined;
                                          try {
                                            const warehouseId = batches[batchIndex].warehouseId as WarehouseId | undefined;
                                            const info = await getModalPriceForWarehouse(productId, warehouseId);
                                            if (info) {
                                              const threeTier = computeThreeTierPricing(info.modalPrice, grade);
                                              pricing = {
                                                market: info.market,
                                                commodity: info.commodity,
                                                modalPrice: info.modalPrice,
                                                farmerPayoutPerUnit: threeTier.farmerPayoutPerUnit,
                                                warehousePricePerUnit: threeTier.warehousePricePerUnit,
                                                retailerSellingPricePerUnit: threeTier.retailerSellingPricePerUnit,
                                                csvDate: String(info.dateSerial),
                                                computedAt: new Date().toISOString(),
                                                source: 'csv',
                                              };
                                            }
                                          } catch {
                                            // Silently fall back to default pricing
                                          }

                                          const updateBatch: BatchWithDetails = {
                                            ...updateBatchBase,
                                            ...(pricing ? { pricing } : {}),
                                          };

                                          batches[batchIndex] = updateBatch;
                                          localStorage.setItem('agrovia_batches', JSON.stringify(batches));

                                          // Show success screen
                                          setGradedBatch({ batch: updateBatch, grade });

                                          const pricePerUnit = pricing?.retailerSellingPricePerUnit ?? getProductPrice(selectedBatch.cropType, grade);
                                          toast({
                                            title: 'Quality Test Complete',
                                            description: `Batch graded as ${grade}. Farmer: Rs.${pricing?.farmerPayoutPerUnit ?? Math.round(pricePerUnit * 0.95)}/${product?.unit || 'kg'}, Retailer: Rs.${pricePerUnit}/${product?.unit || 'kg'}`,
                                          });
                                        }}
                                      >
                                        <CheckCircle2 className="mr-2 h-6 w-6" /> Apply Grade & Continue
                                      </Button>

                                      <Button
                                        onClick={() => setAiResult(null)}
                                        variant="outline"
                                        className="w-full h-12 text-sm font-medium border-2 hover:bg-secondary/80 hover:border-primary/50 transition-all rounded-xl text-muted-foreground"
                                      >
                                        <RefreshCw className="mr-2 h-4 w-4" /> Scan Again
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Details Panel */}
                                <div className="space-y-6">
                                  <Card className="glass-card">
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2">
                                        <Microscope className="h-5 w-5 text-primary" /> Analysis Details
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                      <div className="space-y-4">
                                        <div>
                                          <div className="flex justify-between text-sm mb-2">
                                            <span>Visual Consistency</span>
                                            <span className="font-bold">94%</span>
                                          </div>
                                          <Progress value={94} className="h-2" />
                                        </div>
                                        <div>
                                          <div className="flex justify-between text-sm mb-2">
                                            <span>Size Uniformity</span>
                                            <span className="font-bold">88%</span>
                                          </div>
                                          <Progress value={88} className="h-2" />
                                        </div>
                                        <div>
                                          <div className="flex justify-between text-sm mb-2">
                                            <span>Color Vibrancy</span>
                                            <span className="font-bold">92%</span>
                                          </div>
                                          <Progress value={92} className="h-2" />
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white/40 rounded-lg p-3 text-sm text-left border">
                              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Detailed Findings:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                {aiResult.defects.map((defect, i) => <li key={i}>{defect}</li>)}
                              </ul>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => setAiResult(null)}
                              size="sm"
                              className="text-xs"
                            >
                              Rescan Batch
                            </Button>
                          </div>
                        )}
                      </div>

                      {(() => {
                        const product = getProductById(selectedBatch.cropType);
                        return (
                          <div className="grid grid-cols-2 gap-3 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Product</p>
                              <p className="font-semibold">{product?.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Storage</p>
                              <p className="font-semibold">{selectedBatch.storage?.storageType}</p>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-base">Visual Appearance (1-5)</Label>
                            <span className="text-2xl font-bold text-primary">{visualQuality[0]}</span>
                          </div>

                          <div className="bg-secondary/30 p-2 rounded-xl">
                            <Slider
                              value={visualQuality}
                              onValueChange={setVisualQuality}
                              min={1}
                              max={5}
                              step={1}
                              className="py-4 cursor-pointer"
                            />
                          </div>

                          <div className="flex justify-between px-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setVisualQuality([star])}
                                className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${star === visualQuality[0] ? 'scale-110' : 'opacity-50'}`}
                              >
                                <Star
                                  className={`h-8 w-8 transition-colors ${star <= visualQuality[0] ? 'text-warning fill-warning' : 'text-muted-foreground'}`}
                                />
                                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                                  {star === 1 ? 'Poor' : star === 5 ? 'Perfect' : ''}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base">Firmness Level</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['Low', 'Medium', 'High'] as Firmness[]).map((level) => (
                              <button
                                key={level}
                                onClick={() => setFirmness(level)}
                                className={cn(
                                  "py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                                  firmness === level
                                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                                    : "border-transparent bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                )}
                              >
                                <Thermometer className={cn("h-5 w-5", firmness === level ? "text-primary" : "text-muted-foreground")} />
                                <span className="font-semibold">{level}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Predicted Grade Preview */}
                      <div className="p-5 bg-gradient-to-r from-secondary to-secondary/30 rounded-2xl border border-white/20 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Predicted Result</p>
                            <p className="text-xs text-muted-foreground max-w-[150px]">Based on current parameters</p>
                          </div>
                          <div className="text-right">
                            <Badge className={`text-2xl py-2 px-6 rounded-xl overflow-hidden shadow-lg transition-colors duration-500 ${gradeColors[calculatedGrade]}`}>
                              {calculatedGrade}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <SmartButton
                        onClick={handleGrade}
                        className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:scale-[1.02] transition-transform"
                        isLoading={isGrading}
                        loadingText="Processing Grade..."
                        successText="Grade Confirmed!"
                        icon={<CheckCircle2 className="h-5 w-5" />}
                      >
                        Confirm Quality Grade
                      </SmartButton>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Tests Sidebar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold px-2">Recently Graded</h3>
            <div className="space-y-4">
              {testedBatches.slice(0, 5).map((batch) => {
                const product = getProductById(batch.cropType);
                const pricePerUnit = batch.qualityGrade ? getProductPrice(batch.cropType, batch.qualityGrade) : 0;
                return (
                  <div
                    key={batch.batchId}
                    className="group glass-card p-4 rounded-2xl border border-white/10 hover:border-primary/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${gradeColors[batch.qualityGrade!]}`}>
                        {batch.qualityGrade}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{product?.name || batch.cropType}</p>
                        <p className="text-xs text-muted-foreground font-mono">{batch.batchId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">Rs.{pricePerUnit}</p>
                      <p className="text-xs text-muted-foreground">per {product?.unit}</p>
                    </div>
                  </div>
                );
              })}
              {testedBatches.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
                  No batches have been graded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <SuccessCelebration
          show={showSuccess}
          title="Quality Test Complete!"
          description={`Batch graded as ${gradedBatch?.grade}. Ready for sale!`}
          onClose={() => setShowSuccess(false)}
          actions={[
            {
              label: "Grade Another",
              onClick: () => {
                setShowSuccess(false);
                resetForm();
              }
            },
            {
              label: "View Results",
              onClick: () => {
                setShowSuccess(false);
                // Keep the results visible
              },
              variant: "outline"
            }
          ]}
        />
      </div>
    </Layout>
  );
}
