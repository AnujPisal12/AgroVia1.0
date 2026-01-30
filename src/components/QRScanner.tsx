import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

export function QRScanner({ open, onClose, onScan }: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrCodeRegionId = "qr-reader";

    useEffect(() => {
        if (open && !isScanning && !error) {
            checkCameraPermission();
        }

        return () => {
            stopScanner();
        };
    }, [open]);

    const checkCameraPermission = async () => {
        try {
            // Check if camera permission is available
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the test stream
            setPermissionGranted(true);
            startScanner();
        } catch (err) {
            console.error("Camera permission denied:", err);
            setError("Camera access denied. Please allow camera permissions and try again.");
            setPermissionGranted(false);
            toast.error("Camera access denied. Please check your browser permissions.");
        }
    };

    const startScanner = async () => {
        try {
            setError(null);
            
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(qrCodeRegionId);
            }

            // Check if scanner is already running
            if (scannerRef.current.getState() === 2) { // SCANNING state
                return;
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
                defaultZoomValueIfSupported: 2,
            };

            // Try to get available cameras
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length === 0) {
                throw new Error("No cameras found on this device.");
            }

            // Prefer back camera if available
            let cameraId = devices[0].id;
            const backCamera = devices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
            );
            if (backCamera) {
                cameraId = backCamera.id;
            }

            await scannerRef.current.start(
                cameraId,
                config,
                (decodedText) => {
                    // Success callback
                    console.log("QR Code scanned:", decodedText);
                    onScan(decodedText);
                    stopScanner();
                    onClose();
                    toast.success("QR Code scanned successfully!");
                },
                (errorMessage) => {
                    // Error callback - we can ignore these as they happen frequently during scanning
                    // Only log actual errors, not scanning attempts
                    if (!errorMessage.includes("No QR code found")) {
                        console.log("Scanner error:", errorMessage);
                    }
                }
            );

            setIsScanning(true);
        } catch (err: any) {
            console.error("Error starting scanner:", err);
            const errorMsg = err.message || "Failed to start camera scanner";
            setError(errorMsg);
            toast.error(errorMsg);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    const handleClose = () => {
        stopScanner();
        setError(null);
        setPermissionGranted(null);
        onClose();
    };

    const handleRetry = () => {
        setError(null);
        setPermissionGranted(null);
        checkCameraPermission();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Scan QR Code
                    </DialogTitle>
                    <DialogDescription>
                        Position the QR code within the frame to scan
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <div
                        id={qrCodeRegionId}
                        className="rounded-lg overflow-hidden border-2 border-primary/20 min-h-[300px]"
                    />

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-secondary/90 rounded-lg">
                            <div className="text-center space-y-4 p-4">
                                <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                                <div>
                                    <p className="text-sm font-medium text-destructive mb-2">Camera Error</p>
                                    <p className="text-xs text-muted-foreground mb-4">{error}</p>
                                    <Button onClick={handleRetry} size="sm">
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isScanning && !error && permissionGranted === null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 rounded-lg">
                            <div className="text-center space-y-2">
                                <Camera className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
                                <p className="text-sm text-muted-foreground">Requesting camera access...</p>
                            </div>
                        </div>
                    )}

                    {!isScanning && !error && permissionGranted === true && (
                        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 rounded-lg">
                            <div className="text-center space-y-2">
                                <Camera className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
                                <p className="text-sm text-muted-foreground">Initializing camera...</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between gap-2">
                    {error && (
                        <Button variant="outline" onClick={handleRetry} className="flex-1">
                            <Camera className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleClose} className={error ? "flex-1" : "w-full"}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
