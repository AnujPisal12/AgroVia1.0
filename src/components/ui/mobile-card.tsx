import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MobileCardProps {
  title: string
  subtitle?: string
  status?: {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    color?: string
  }
  metadata?: Array<{
    label: string
    value: string
    icon?: React.ReactNode
  }>
  actions?: Array<{
    label: string
    onClick: () => void
    icon?: React.ReactNode
    variant?: "default" | "destructive" | "outline"
  }>
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export function MobileCard({
  title,
  subtitle,
  status,
  metadata = [],
  actions = [],
  onClick,
  className,
  children,
  ...props
}: MobileCardProps) {
  return (
    <Card 
      className={cn(
        "w-full transition-all duration-200 hover:shadow-md active:scale-[0.98]",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-3">
            {status && (
              <Badge 
                variant={status.variant}
                className={cn(
                  "text-xs whitespace-nowrap",
                  status.color && `bg-${status.color}/10 text-${status.color} border-${status.color}/20`
                )}
              >
                {status.label}
              </Badge>
            )}
            
            {actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {actions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                      className="flex items-center gap-2"
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {onClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      {(metadata.length > 0 || children) && (
        <CardContent className="pt-0">
          {metadata.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {metadata.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {item.icon && (
                    <div className="text-muted-foreground">
                      {item.icon}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// Specialized mobile cards for different entities
export function BatchMobileCard({ batch, onClick, actions = [] }: {
  batch: any
  onClick?: () => void
  actions?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }>
}) {
  const product = batch.product || { name: batch.cropType, emoji: '📦' }
  
  return (
    <MobileCard
      title={`${product.emoji} ${product.name}`}
      subtitle={`Batch ${batch.batchId}`}
      status={{
        label: batch.qualityGrade ? `Grade ${batch.qualityGrade}` : 'Pending Test',
        variant: batch.qualityGrade ? 'default' : 'secondary',
        color: batch.qualityGrade === 'A' ? 'green' : batch.qualityGrade === 'B' ? 'yellow' : 'red'
      }}
      metadata={[
        { label: 'Quantity', value: `${batch.quantity} kg` },
        { label: 'Harvest Date', value: new Date(batch.harvestDate).toLocaleDateString() },
        { label: 'Storage', value: batch.storage?.storageType || 'Normal' },
        { label: 'Status', value: batch.status || 'Unknown' }
      ]}
      onClick={onClick}
      actions={actions}
    />
  )
}

export function OrderMobileCard({ order, onClick, actions = [] }: {
  order: any
  onClick?: () => void
  actions?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }>
}) {
  return (
    <MobileCard
      title={`Order ${order.orderId}`}
      subtitle={order.retailerStoreName}
      status={{
        label: order.status,
        variant: order.status === 'Delivered' ? 'default' : 'secondary',
        color: order.status === 'Delivered' ? 'green' : 
               order.status === 'On Delivery' ? 'blue' : 'yellow'
      }}
      metadata={[
        { label: 'Quantity', value: `${order.quantity} crates` },
        { label: 'Order Date', value: new Date(order.orderDate).toLocaleDateString() },
        { label: 'Payment', value: order.paymentStatus || 'Pending' },
        { label: 'Driver', value: order.assignedDriverName || 'Not assigned' }
      ]}
      onClick={onClick}
      actions={actions}
    />
  )
}

export function DriverMobileCard({ driver, onClick, actions = [] }: {
  driver: any
  onClick?: () => void
  actions?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }>
}) {
  return (
    <MobileCard
      title={driver.driverName}
      subtitle={driver.truckNumber}
      status={{
        label: driver.status,
        variant: driver.status === 'On Delivery' ? 'default' : 'secondary',
        color: driver.status === 'On Delivery' ? 'green' : 
               driver.status === 'Available' ? 'blue' : 'yellow'
      }}
      metadata={[
        { label: 'Phone', value: driver.phone || 'N/A' },
        { label: 'Location', value: driver.currentLocation || 'Unknown' },
        { label: 'Rating', value: `${driver.rating || 0}/5` },
        { label: 'Deliveries', value: `${driver.totalDeliveries || 0}` }
      ]}
      onClick={onClick}
      actions={actions}
    />
  )
}