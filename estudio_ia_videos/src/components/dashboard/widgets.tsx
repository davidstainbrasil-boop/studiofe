'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface DashboardWidgetProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  loading?: boolean
  headerAction?: React.ReactNode
  noPadding?: boolean
}

export interface StatWidgetProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  loading?: boolean
  className?: string
  variant?: 'default' | 'gradient' | 'outline' | 'glass'
  color?: 'default' | 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan'
  href?: string
}

export interface ProgressWidgetProps {
  title: string
  value: number
  max?: number
  description?: string
  showPercentage?: boolean
  color?: 'default' | 'blue' | 'green' | 'amber' | 'red'
  className?: string
}

export interface ListWidgetProps<T> {
  title: string
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
  maxItems?: number
  viewAllHref?: string
  className?: string
}

export interface ChartWidgetProps {
  title: string
  description?: string
  children: React.ReactNode
  loading?: boolean
  tabs?: { value: string; label: string }[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  headerAction?: React.ReactNode
  className?: string
}

// ============================================================================
// Color Configurations
// ============================================================================

const colorVariants = {
  default: {
    gradient: 'from-slate-500/10 to-slate-600/5',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
    progress: 'bg-slate-500',
  },
  blue: {
    gradient: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    icon: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    progress: 'bg-blue-500',
  },
  green: {
    gradient: 'from-green-500/10 to-green-600/5',
    border: 'border-green-500/20',
    icon: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    progress: 'bg-green-500',
  },
  amber: {
    gradient: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    icon: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    progress: 'bg-amber-500',
  },
  purple: {
    gradient: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/20',
    icon: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    progress: 'bg-purple-500',
  },
  rose: {
    gradient: 'from-rose-500/10 to-rose-600/5',
    border: 'border-rose-500/20',
    icon: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
    progress: 'bg-rose-500',
  },
  cyan: {
    gradient: 'from-cyan-500/10 to-cyan-600/5',
    border: 'border-cyan-500/20',
    icon: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
    progress: 'bg-cyan-500',
  },
}

// ============================================================================
// Dashboard Widget (Base)
// ============================================================================

export function DashboardWidget({
  title,
  description,
  children,
  className,
  loading = false,
  headerAction,
  noPadding = false,
}: DashboardWidgetProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent className={cn(noPadding && 'p-0')}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Stat Widget
// ============================================================================

export function StatWidget({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  className,
  variant = 'default',
  color = 'default',
  href,
}: StatWidgetProps) {
  const colors = colorVariants[color]

  const cardClasses = cn(
    'relative overflow-hidden transition-all duration-300',
    variant === 'gradient' && `bg-gradient-to-br ${colors.gradient} ${colors.border}`,
    variant === 'glass' && 'bg-white/50 dark:bg-black/50 backdrop-blur-sm border-white/20',
    variant === 'outline' && 'bg-transparent',
    href && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
    className
  )

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cardClasses}>
        {/* Decorative element */}
        {variant === 'gradient' && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        )}

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon && <div className={cn('p-2 rounded-xl', colors.icon)}>{icon}</div>}
        </CardHeader>

        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </>
          ) : (
            <>
              <motion.div
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {value}
              </motion.div>

              {(trend || description) && (
                <div className="flex items-center gap-2 mt-2">
                  {trend && (
                    <div
                      className={cn(
                        'flex items-center text-sm font-medium',
                        trend.direction === 'up' && 'text-green-600',
                        trend.direction === 'down' && 'text-red-500',
                        trend.direction === 'neutral' && 'text-muted-foreground'
                      )}
                    >
                      {trend.direction === 'up' && <ArrowUpRight className="h-4 w-4" />}
                      {trend.direction === 'down' && <ArrowDownRight className="h-4 w-4" />}
                      {trend.direction === 'neutral' && <Minus className="h-4 w-4" />}
                      <span>
                        {trend.direction !== 'neutral' && (trend.direction === 'up' ? '+' : '')}
                        {trend.value}%
                      </span>
                    </div>
                  )}
                  {(trend?.label || description) && (
                    <span className="text-xs text-muted-foreground">
                      {trend?.label || description}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }

  return content
}

// ============================================================================
// Progress Widget
// ============================================================================

export function ProgressWidget({
  title,
  value,
  max = 100,
  description,
  showPercentage = true,
  color = 'default',
  className,
}: ProgressWidgetProps) {
  const percentage = Math.round((value / max) * 100)

  const progressColors = {
    default: 'bg-primary',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        {showPercentage && <span className="text-sm text-muted-foreground">{percentage}%</span>}
      </div>

      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', progressColors[color])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ============================================================================
// List Widget
// ============================================================================

export function ListWidget<T>({
  title,
  items,
  renderItem,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  maxItems,
  viewAllHref,
  className,
}: ListWidgetProps<T>) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items

  return (
    <DashboardWidget
      title={title}
      className={className}
      loading={loading}
      noPadding
      headerAction={
        viewAllHref ? (
          <a
            href={viewAllHref}
            className="text-xs text-primary hover:underline"
          >
            Ver todos
          </a>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <div className="divide-y">
          {displayItems.map((item, index) => (
            <div key={index} className="px-6 py-3 hover:bg-muted/50 transition-colors">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}

      {viewAllHref && items.length > (maxItems || 0) && (
        <div className="p-4 border-t">
          <a
            href={viewAllHref}
            className="text-sm text-primary hover:underline block text-center"
          >
            Ver todos ({items.length} itens)
          </a>
        </div>
      )}
    </DashboardWidget>
  )
}

// ============================================================================
// Chart Widget
// ============================================================================

export function ChartWidget({
  title,
  description,
  children,
  loading = false,
  tabs,
  activeTab,
  onTabChange,
  headerAction,
  className,
}: ChartWidgetProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>

          <div className="flex items-center gap-2">
            {tabs && tabs.length > 0 && (
              <div className="flex rounded-lg border p-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => onTabChange?.(tab.value)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      activeTab === tab.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {headerAction}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Stat Grid (Helper)
// ============================================================================

interface StatGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  }

  return <div className={cn('grid gap-4', gridCols[columns], className)}>{children}</div>
}

// ============================================================================
// Widget Section (Helper)
// ============================================================================

interface WidgetSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function WidgetSection({
  title,
  description,
  children,
  action,
  className,
}: WidgetSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

// ============================================================================
// Export all
// ============================================================================

export default {
  DashboardWidget,
  StatWidget,
  ProgressWidget,
  ListWidget,
  ChartWidget,
  StatGrid,
  WidgetSection,
}
