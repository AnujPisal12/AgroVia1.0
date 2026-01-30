import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  Grid,
  List
} from "lucide-react"

// Hook for responsive breakpoints
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

// Mobile-optimized data table
interface MobileDataTableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    label: string
    render?: (value: any, item: T) => React.ReactNode
  }>
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function MobileDataTable<T>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = "No data available",
  className
}: MobileDataTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* View mode toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.map((item, index) => (
              <Card 
                key={index} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  onRowClick && "cursor-pointer active:scale-[0.98]"
                )}
                onClick={() => onRowClick?.(item)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {columns.slice(0, 3).map((col) => (
                      <div key={String(col.key)} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {col.label}
                        </span>
                        <span className="text-sm font-medium">
                          {col.render 
                            ? col.render(item[col.key], item)
                            : String(item[col.key])
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <Card 
                key={index} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  onRowClick && "cursor-pointer active:scale-[0.98]"
                )}
                onClick={() => onRowClick?.(item)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {columns.map((col) => (
                      <div key={String(col.key)} className="flex justify-between py-1">
                        <span className="text-sm text-muted-foreground">
                          {col.label}
                        </span>
                        <span className="text-sm font-medium">
                          {col.render 
                            ? col.render(item[col.key], item)
                            : String(item[col.key])
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Desktop table view
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th key={String(col.key)} className="h-12 px-4 text-left align-middle font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr 
              key={index}
              className={cn(
                "border-b transition-colors hover:bg-muted/50",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="p-4 align-middle">
                  {col.render 
                    ? col.render(item[col.key], item)
                    : String(item[col.key])
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Mobile navigation drawer
interface MobileDrawerProps {
  trigger: React.ReactNode
  title?: string
  children: React.ReactNode
  side?: "left" | "right" | "top" | "bottom"
}

export function MobileDrawer({
  trigger,
  title,
  children,
  side = "left"
}: MobileDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side={side} className="w-full sm:w-80">
        {title && (
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}
        {children}
      </SheetContent>
    </Sheet>
  )
}

// Swipeable card component
interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentX = e.touches[0].clientX - startX
    setCurrentX(currentX)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const threshold = 100
    if (currentX > threshold && onSwipeRight) {
      onSwipeRight()
    } else if (currentX < -threshold && onSwipeLeft) {
      onSwipeLeft()
    }
    
    setCurrentX(0)
    setIsDragging(false)
  }

  return (
    <div
      className={cn(
        "transition-transform duration-200 touch-pan-y",
        className
      )}
      style={{
        transform: isDragging ? `translateX(${currentX}px)` : 'translateX(0)'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

// Bottom sheet component for mobile
interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        {title && (
          <div className="border-b pb-4 mb-4">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-center">{title}</h2>
          </div>
        )}
        <div className="overflow-y-auto h-full pb-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Touch-friendly button group
interface TouchButtonGroupProps {
  buttons: Array<{
    label: string
    value: string
    icon?: React.ReactNode
  }>
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function TouchButtonGroup({
  buttons,
  value,
  onValueChange,
  className
}: TouchButtonGroupProps) {
  return (
    <div className={cn("flex rounded-lg border p-1 bg-muted/50", className)}>
      {buttons.map((button) => (
        <Button
          key={button.value}
          variant={value === button.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onValueChange(button.value)}
          className="flex-1 h-10 gap-2"
        >
          {button.icon}
          {button.label}
        </Button>
      ))}
    </div>
  )
}

// Pull-to-refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  className
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return
    
    const touch = e.touches[0]
    const distance = Math.max(0, touch.clientY - 100)
    setPullDistance(Math.min(distance, 100))
  }

  const handleTouchEnd = async () => {
    if (!isPulling) return
    
    setIsPulling(false)
    
    if (pullDistance > 60) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
  }

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-200"
          style={{ height: `${pullDistance}px` }}
        >
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Refreshing...
            </div>
          ) : pullDistance > 60 ? (
            <div className="text-sm text-primary font-medium">
              Release to refresh
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Pull to refresh
            </div>
          )}
        </div>
      )}
      
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  )
}