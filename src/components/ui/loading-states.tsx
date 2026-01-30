import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Upload
} from "lucide-react"

// Skeleton components for loading states
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

// Smart loading button with states
interface SmartButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  success?: boolean
  error?: boolean
  loadingText?: string
  successText?: string
  errorText?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  icon?: React.ReactNode
  onSuccess?: () => void
  onError?: () => void
}

export function SmartButton({
  children,
  isLoading = false,
  success = false,
  error = false,
  loadingText = "Loading...",
  successText = "Success!",
  errorText = "Error",
  variant = "default",
  size = "default",
  icon,
  onSuccess,
  onError,
  className,
  ...props
}: SmartButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (success) {
      setShowSuccess(true)
      onSuccess?.()
      const timer = setTimeout(() => setShowSuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [success, onSuccess])

  useEffect(() => {
    if (error) {
      setShowError(true)
      onError?.()
      const timer = setTimeout(() => setShowError(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [error, onError])

  return (
    <Button
      variant={showError ? "destructive" : variant}
      size={size}
      disabled={isLoading}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        showSuccess && "bg-green-600 hover:bg-green-700",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex items-center gap-2 transition-all duration-200",
        isLoading && "animate-pulse",
        showSuccess && "animate-bounce",
        showError && "animate-shake"
      )}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </>
        ) : showSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            {successText}
          </>
        ) : showError ? (
          <>
            <AlertCircle className="h-4 w-4" />
            {errorText}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </div>
    </Button>
  )
}

// Progress indicator component
interface ProgressIndicatorProps {
  steps: Array<{
    id: string
    title: string
    description?: string
  }>
  currentStep: number
  className?: string
}

export function ProgressIndicator({
  steps,
  currentStep,
  className
}: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          const isUpcoming = index > currentStep

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive && "bg-primary/20 text-primary border-2 border-primary",
                    isUpcoming && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-all duration-300",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Success celebration component
interface SuccessCelebrationProps {
  show: boolean
  title: string
  description?: string
  onClose?: () => void
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: "default" | "outline"
  }>
}

export function SuccessCelebration({
  show,
  title,
  description,
  onClose,
  actions = []
}: SuccessCelebrationProps) {
  useEffect(() => {
    if (show && onClose) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md text-center animate-in zoom-in-95 duration-300">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold animate-in slide-in-from-bottom-2 duration-500">
            {title}
          </h3>
          {description && (
            <p className="text-muted-foreground animate-in slide-in-from-bottom-2 duration-700">
              {description}
            </p>
          )}
        </CardHeader>
        
        {actions.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex gap-2 justify-center">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// File upload with progress
interface FileUploadProgressProps {
  files: File[]
  onUpload: (files: File[]) => Promise<void>
  onComplete?: () => void
}

export function FileUploadProgress({
  files,
  onUpload,
  onComplete
}: FileUploadProgressProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setProgress(0)

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await onUpload(files)
      
      clearInterval(interval)
      setProgress(100)
      setSuccess(true)
      onComplete?.()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {files.map((file, index) => (
        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {uploading && (
            <div className="w-20">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {success && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>
      ))}
      
      {files.length > 0 && !success && (
        <SmartButton
          onClick={handleUpload}
          isLoading={uploading}
          success={success}
          loadingText="Uploading..."
          successText="Uploaded!"
          className="w-full"
        >
          Upload {files.length} file{files.length > 1 ? 's' : ''}
        </SmartButton>
      )}
    </div>
  )
}