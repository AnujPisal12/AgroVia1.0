import * as React from "react"
import { useState, useCallback } from "react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  Maximize2, 
  Filter, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ChartData {
  name: string
  value: number
  color?: string
  [key: string]: any
}

interface InteractiveChartProps {
  title: string
  data: ChartData[]
  type: 'pie' | 'bar' | 'line'
  height?: number
  onDrillDown?: (data: ChartData) => void
  onExport?: (format: 'png' | 'pdf' | 'csv') => void
  refreshable?: boolean
  onRefresh?: () => void
  className?: string
  showLegend?: boolean
  showExport?: boolean
  realTimeUpdate?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const InteractiveLegend = ({ 
  data, 
  selectedItems, 
  onItemClick 
}: {
  data: ChartData[]
  selectedItems: Set<string>
  onItemClick: (name: string) => void
}) => {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {data.map((item, index) => {
        const isSelected = selectedItems.has(item.name)
        return (
          <button
            key={index}
            onClick={() => onItemClick(item.name)}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-all",
              isSelected 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            )}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            {item.name}
            <span className="font-medium">{item.value}</span>
          </button>
        )
      })}
    </div>
  )
}

export function InteractiveChart({
  title,
  data,
  type,
  height = 300,
  onDrillDown,
  onExport,
  refreshable = false,
  onRefresh,
  className,
  showLegend = true,
  showExport = true,
  realTimeUpdate = false
}: InteractiveChartProps) {
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [selectedLegendItems, setSelectedLegendItems] = useState<Set<string>>(
    new Set(data.map(item => item.name))
  )
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredData = data.filter(item => selectedLegendItems.has(item.name))

  const handleLegendClick = useCallback((name: string) => {
    setSelectedLegendItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(name)) {
        newSet.delete(name)
      } else {
        newSet.add(name)
      }
      return newSet
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  const handleExport = useCallback((format: 'png' | 'pdf' | 'csv') => {
    if (onExport) {
      onExport(format)
    } else {
      // Default export functionality
      if (format === 'csv') {
        const csvContent = [
          ['Name', 'Value'],
          ...data.map(item => [item.name, item.value.toString()])
        ].map(row => row.join(',')).join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }, [data, title, onExport])

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setSelectedSegment(index)}
              onMouseLeave={() => setSelectedSegment(null)}
              onClick={onDrillDown}
              className="cursor-pointer"
            >
              {filteredData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || `hsl(${index * 45}, 70%, 50%)`}
                  stroke={selectedSegment === index ? '#fff' : 'none'}
                  strokeWidth={selectedSegment === index ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        )
      
      case 'bar':
        return (
          <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              onClick={onDrillDown}
              className="cursor-pointer"
            />
          </BarChart>
        )
      
      case 'line':
        return (
          <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
            <XAxis 
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </LineChart>
        )
      
      default:
        return null
    }
  }

  const getTrendIndicator = () => {
    if (data.length < 2) return null
    
    const current = data[data.length - 1]?.value || 0
    const previous = data[data.length - 2]?.value || 0
    const change = ((current - previous) / previous) * 100
    
    if (Math.abs(change) < 1) {
      return (
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3" />
          No change
        </Badge>
      )
    }
    
    return (
      <Badge 
        variant={change > 0 ? "default" : "destructive"} 
        className="gap-1"
      >
        {change > 0 ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {Math.abs(change).toFixed(1)}%
      </Badge>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{title}</CardTitle>
            {realTimeUpdate && (
              <Badge variant="outline" className="gap-1 animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Live
              </Badge>
            )}
            {getTrendIndicator()}
          </div>
          
          <div className="flex items-center gap-2">
            {refreshable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            )}
            
            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('png')}>
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        
        {showLegend && (
          <InteractiveLegend
            data={data}
            selectedItems={selectedLegendItems}
            onItemClick={handleLegendClick}
          />
        )}
      </CardContent>
    </Card>
  )
}

// Mobile-optimized chart component
export function MobileChart({
  title,
  data,
  type,
  className
}: {
  title: string
  data: ChartData[]
  type: 'pie' | 'bar' | 'line'
  className?: string
}) {
  return (
    <InteractiveChart
      title={title}
      data={data}
      type={type}
      height={200}
      showLegend={false}
      showExport={false}
      className={cn("touch-manipulation", className)}
    />
  )
}