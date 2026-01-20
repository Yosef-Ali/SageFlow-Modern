'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Sparkles, Send, X, Bot, User, Lightbulb, Minimize2, Maximize2,
  RotateCcw, TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Info, AlertTriangle, Clock, ArrowRight, Calendar, Zap,
  DollarSign, Users, Package, Mic, MicOff
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ============================================================================
// TYPES
// ============================================================================

type MessageRole = 'user' | 'assistant'

interface A2UIMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
}

interface Suggestion {
  id: string
  label: string
  prompt: string
}

interface StatItem {
  label: string
  value: string
  change?: string
}

interface ListItem {
  primary: string
  secondary?: string
  value?: string
  status?: 'pending' | 'overdue' | 'paid' | 'active'
}

interface CardItem {
  label: string
  value: string
  highlight?: boolean
}

interface StatsWidget {
  type: 'stats'
  items: StatItem[]
}

interface ListWidget {
  type: 'list'
  title?: string
  items: ListItem[]
}

interface ProgressWidget {
  type: 'progress'
  label: string
  current: number
  target: number
  unit?: string
}

interface CardWidget {
  type: 'card'
  title?: string
  items: CardItem[]
}

interface FormField {
  id: string
  label: string
  type: 'text' | 'number' | 'select'
  placeholder?: string
  options?: string[]
}

interface FormWidget {
  type: 'form'
  title?: string
  fields: FormField[]
}

// New widget types
interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

interface ChartWidget {
  type: 'chart'
  chartType: 'bar' | 'pie' | 'line'
  title?: string
  data: ChartDataPoint[]
}

interface TableRow {
  [key: string]: string | number
}

interface TableWidget {
  type: 'table'
  title?: string
  headers: string[]
  rows: TableRow[]
}

interface AlertWidget {
  type: 'alert'
  variant: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
}

interface TimelineEvent {
  date: string
  title: string
  description?: string
  status?: 'completed' | 'current' | 'upcoming'
}

interface TimelineWidget {
  type: 'timeline'
  title?: string
  events: TimelineEvent[]
}

interface ComparisonWidget {
  type: 'comparison'
  title?: string
  items: Array<{
    label: string
    before: string | number
    after: string | number
    change?: string
  }>
}

interface MetricWidget {
  type: 'metric'
  value: string
  label: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

interface ActionWidget {
  type: 'action'
  title?: string
  actions: Array<{
    id: string
    label: string
    description?: string
    variant?: 'default' | 'destructive' | 'outline'
  }>
}

// New widget types for AI chatbot improvements
interface GaugeWidget {
  type: 'gauge'
  value: number
  max: number
  label: string
  thresholds?: { warning: number; critical: number }
}

interface SparklineWidget {
  type: 'sparkline'
  title: string
  data: number[]
  trend: 'up' | 'down' | 'neutral'
  currentValue: string
}

interface KPICardWidget {
  type: 'kpicard'
  icon: 'dollar' | 'users' | 'package' | 'alert' | 'trending'
  label: string
  value: string
  trend?: { value: string; direction: 'up' | 'down' }
  color?: 'green' | 'red' | 'blue' | 'amber'
}

interface DistributionItem {
  label: string
  value: number
  color?: string
}

interface DistributionWidget {
  type: 'distribution'
  title: string
  items: DistributionItem[]
}

type Widget = StatsWidget | ListWidget | ProgressWidget | CardWidget | FormWidget |
  ChartWidget | TableWidget | AlertWidget | TimelineWidget | ComparisonWidget | MetricWidget | ActionWidget |
  GaugeWidget | SparklineWidget | KPICardWidget | DistributionWidget

interface ParsedContent {
  text: string
  widgets: Widget[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUGGESTIONS: Record<string, Suggestion[]> = {
  '/dashboard': [
    { id: '1', label: 'Financial Summary', prompt: 'Give me a summary of my financial performance this month with key metrics.' },
    { id: '2', label: 'Cash Flow', prompt: 'Analyze my current cash flow situation.' },
    { id: '3', label: 'VAT Calculation', prompt: 'Calculate VAT for a sale of ETB 25,000.' },
  ],
  '/dashboard/invoices': [
    { id: '1', label: 'Unpaid Invoices', prompt: 'Show me a summary of unpaid invoices.' },
    { id: '2', label: 'Overdue Report', prompt: 'What invoices are overdue and need attention?' },
    { id: '3', label: 'Invoice Help', prompt: 'Help me create a professional invoice.' },
  ],
  '/dashboard/customers': [
    { id: '1', label: 'Top Customers', prompt: 'Who are my most valuable customers?' },
    { id: '2', label: 'Customer Analysis', prompt: 'Analyze customer payment patterns.' },
  ],
  '/dashboard/vendors': [
    { id: '1', label: 'Vendor Balance', prompt: 'What is my total outstanding balance to vendors?' },
    { id: '2', label: 'Vendor Types', prompt: 'List vendors by their Peachtree type (Supplier, Contractor, etc.).' },
    { id: '3', label: 'Credit Limits', prompt: 'Which vendors have I exceeded credit limits with?' },
  ],
  '/dashboard/inventory': [
    { id: '1', label: 'Low Stock', prompt: 'Which items are below reorder point?' },
    { id: '2', label: 'Price List', prompt: 'Show me the Retail, Wholesale, and Distributor prices for items.' },
    { id: '3', label: 'Valuation', prompt: 'What is the total value of my inventory?' },
  ],
  '/dashboard/employees': [
    { id: '1', label: 'Payroll Summary', prompt: 'Calculate total monthly payroll cost including overtime.' },
    { id: '2', label: 'Employee Types', prompt: 'Break down employees by type (Regular vs Contract).' },
    { id: '3', label: 'Bank Info', prompt: 'List employees missing bank account details.' },
  ],
  'default': [
    { id: '1', label: 'VAT Guide', prompt: 'Explain how Ethiopian VAT works with an example calculation.' },
    { id: '2', label: 'Accounting Help', prompt: 'What is the difference between cash and accrual accounting?' },
    { id: '3', label: 'Tax Rates', prompt: 'What are the current tax rates in Ethiopia?' },
  ]
}

const INITIAL_MESSAGE: A2UIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Welcome to SageFlow AI. I'm here to help with your accounting, taxes, and financial analysis. Ask me anything about Ethiopian business practices, VAT calculations, or invoice management.",
  timestamp: new Date(),
  status: 'sent',
}

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

function StatsWidgetComponent({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 my-2">
      {items.map((item, i) => (
        <Card key={i} className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
          <p className="text-lg font-semibold">{item.value}</p>
          {item.change && (
            <div className={cn(
              "flex items-center gap-1 mt-1 text-xs",
              item.change.startsWith('+') ? "text-emerald-600" : "text-destructive"
            )}>
              {item.change.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {item.change}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function ListWidgetComponent({ title, items }: { title?: string; items: ListItem[] }) {
  const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary' as const },
    overdue: { label: 'Overdue', variant: 'destructive' as const },
    paid: { label: 'Paid', variant: 'default' as const },
    active: { label: 'Active', variant: 'default' as const },
  }

  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item, i) => {
            const status = item.status ? statusConfig[item.status] : null
            return (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {status && (
                    <Badge variant={status.variant} className="text-[10px]">
                      {status.label}
                    </Badge>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.primary}</p>
                    {item.secondary && (
                      <p className="text-xs text-muted-foreground truncate">{item.secondary}</p>
                    )}
                  </div>
                </div>
                {item.value && (
                  <p className="text-sm font-semibold pl-2 shrink-0">{item.value}</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ProgressWidgetComponent({ label, current, target, unit }: ProgressWidget) {
  const percentage = Math.min((current / target) * 100, 100)
  const formatNumber = (n: number) => n.toLocaleString()

  return (
    <Card className="my-2 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</p>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="flex items-center justify-between mt-2 text-xs">
        <span>{unit}{formatNumber(current)}</span>
        <span className="text-muted-foreground">of {unit}{formatNumber(target)}</span>
      </div>
    </Card>
  )
}

function CardWidgetComponent({ title, items }: { title?: string; items: CardItem[] }) {
  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3 bg-muted/50">
          <CardTitle className="text-xs font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-3 space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between py-1",
              item.highlight && "pt-2 mt-1 border-t"
            )}
          >
            <span className={cn(
              "text-sm",
              item.highlight ? "font-semibold" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
            <span className={cn(
              "text-sm font-mono",
              item.highlight && "font-bold"
            )}>
              {item.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function FormWidgetComponent({
  title,
  fields,
  onSubmit
}: {
  title?: string
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => void
}) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSubmitted) return

    // Check if at least one field has a value
    const hasData = Object.values(formData).some(v => v && v.trim())
    if (!hasData) return

    setIsSubmitted(true)
    onSubmit(formData)
  }

  if (isSubmitted) {
    return (
      <Card className="my-2 overflow-hidden">
        {title && (
          <CardHeader className="py-2 px-3 bg-muted/50">
            <CardTitle className="text-xs font-semibold">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Data submitted</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3 bg-muted/50">
          <CardTitle className="text-xs font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <Label htmlFor={field.id} className="text-xs">{field.label}</Label>
              {field.type === 'select' && field.options ? (
                <Select
                  value={formData[field.id] || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, [field.id]: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={field.placeholder || 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                  className="h-8 text-xs"
                />
              )}
            </div>
          ))}
          <Button type="submit" size="sm" className="w-full mt-2">
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function ChartWidgetComponent({ chartType, title, data }: Omit<ChartWidget, 'type'>) {
  const chartData = data.map((d, i) => ({ ...d, fill: d.color || CHART_COLORS[i % CHART_COLORS.length] }))

  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-2">
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={50}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        {chartType === 'pie' && (
          <div className="flex flex-wrap gap-2 mt-2 px-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TableWidgetComponent({ title, headers, rows }: Omit<TableWidget, 'type'>) {
  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  {headers.map((h, j) => (
                    <td key={j} className="px-3 py-2">{row[h] ?? row[h.toLowerCase()] ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertWidgetComponent({ variant, title, message }: Omit<AlertWidget, 'type'>) {
  const config = {
    info: { icon: Info, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
    success: { icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
    error: { icon: AlertCircle, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
  }
  const { icon: Icon, bg, border, text } = config[variant]

  return (
    <div className={cn('my-2 p-3 rounded-lg border flex gap-3', bg, border)}>
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', text)} />
      <div className="space-y-1">
        {title && <p className={cn('text-xs font-semibold', text)}>{title}</p>}
        <p className={cn('text-xs', text)}>{message}</p>
      </div>
    </div>
  )
}

function TimelineWidgetComponent({ title, events }: Omit<TimelineWidget, 'type'>) {
  const statusConfig = {
    completed: { color: 'bg-emerald-500', icon: CheckCircle2 },
    current: { color: 'bg-blue-500', icon: Clock },
    upcoming: { color: 'bg-muted-foreground/30', icon: Calendar },
  }

  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-3">
        <div className="space-y-0">
          {events.map((event, i) => {
            const status = event.status || 'upcoming'
            const { color, icon: StatusIcon } = statusConfig[status]
            return (
              <div key={i} className="flex gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', color)}>
                    <StatusIcon className="h-3 w-3 text-white" />
                  </div>
                  {i < events.length - 1 && <div className="w-0.5 flex-1 bg-muted mt-1" />}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-medium">{event.title}</p>
                  <p className="text-[10px] text-muted-foreground">{event.date}</p>
                  {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ComparisonWidgetComponent({ title, items }: Omit<ComparisonWidget, 'type'>) {
  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3 bg-muted/50">
          <CardTitle className="text-xs font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-3 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Before</p>
                <p className="text-sm font-semibold">{item.before}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center p-2 rounded bg-primary/10">
                <p className="text-xs text-muted-foreground">After</p>
                <p className="text-sm font-semibold">{item.after}</p>
              </div>
            </div>
            {item.change && (
              <p className={cn(
                'text-[10px] text-right',
                item.change.startsWith('+') ? 'text-emerald-600' : item.change.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {item.change}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MetricWidgetComponent({ value, label, description, trend, trendValue }: MetricWidget) {
  return (
    <Card className="my-2 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
          {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-muted text-muted-foreground'
          )}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}

function ActionWidgetComponent({
  title,
  actions,
  onAction
}: {
  title?: string
  actions: ActionWidget['actions']
  onAction?: (id: string) => void
}) {
  return (
    <Card className="my-2 overflow-hidden">
      {title && (
        <CardHeader className="py-2 px-3 bg-muted/50">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Zap className="h-3 w-3" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-2">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant === 'destructive' ? 'destructive' : action.variant === 'outline' ? 'outline' : 'default'}
              size="sm"
              className="h-auto py-1.5 px-3 text-xs"
              onClick={() => onAction?.(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// NEW WIDGETS - Gauge, Sparkline, KPI Card, Distribution
// ============================================================================

function GaugeWidgetComponent({ value, max, label, thresholds }: Omit<GaugeWidget, 'type'>) {
  const percentage = Math.min((value / max) * 100, 100)
  const circumference = 2 * Math.PI * 40 // radius = 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75 // 75% arc

  // Determine color based on thresholds
  let color = 'text-emerald-500'
  let bgColor = 'stroke-emerald-500'
  if (thresholds) {
    if (percentage <= thresholds.critical) {
      color = 'text-red-500'
      bgColor = 'stroke-red-500'
    } else if (percentage <= thresholds.warning) {
      color = 'text-amber-500'
      bgColor = 'stroke-amber-500'
    }
  }

  return (
    <Card className="my-2 p-4">
      <div className="flex items-center justify-between">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-135" viewBox="0 0 100 100">
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference * 0.75}
              className="text-muted/30"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset={strokeDashoffset}
              className={cn('transition-all duration-500', bgColor)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-lg font-bold', color)}>{Math.round(percentage)}%</span>
          </div>
        </div>
        <div className="flex-1 pl-4">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {value.toLocaleString()} / {max.toLocaleString()}
          </p>
          {thresholds && (
            <div className="flex gap-2 mt-2 text-[10px]">
              <span className="text-emerald-500">● Good: &gt;{thresholds.warning}%</span>
              <span className="text-amber-500">● Warning: &gt;{thresholds.critical}%</span>
              <span className="text-red-500">● Critical: ≤{thresholds.critical}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function SparklineWidgetComponent({ title, data, trend, currentValue }: Omit<SparklineWidget, 'type'>) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const height = 32
  const width = 120

  // Create SVG path for sparkline
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground'
  }

  const lineColors = {
    up: '#10b981',
    down: '#ef4444',
    neutral: '#6b7280'
  }

  return (
    <Card className="my-2 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-semibold">{currentValue}</span>
            <span className={cn('flex items-center text-xs', trendColors[trend])}>
              {trend === 'up' && <TrendingUp className="h-3 w-3 mr-0.5" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trend}
            </span>
          </div>
        </div>
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke={lineColors[trend]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {/* Dot at the end */}
          <circle
            cx={width}
            cy={height - ((data[data.length - 1] - min) / range) * height}
            r="3"
            fill={lineColors[trend]}
          />
        </svg>
      </div>
    </Card>
  )
}

function KPICardWidgetComponent({ icon, label, value, trend, color = 'blue' }: Omit<KPICardWidget, 'type'>) {
  const iconMap = {
    dollar: DollarSign,
    users: Users,
    package: Package,
    alert: AlertCircle,
    trending: TrendingUp
  }
  const IconComponent = iconMap[icon]

  const colorClasses = {
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
  }

  return (
    <Card className="my-2 p-4">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-1 text-xs',
              trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function DistributionWidgetComponent({ title, items }: Omit<DistributionWidget, 'type'>) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <Card className="my-2 overflow-hidden">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {items.map((item, i) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          const color = item.color || defaultColors[i % defaultColors.length]

          return (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{item.label}</span>
                </div>
                <span className="font-medium">ETB {item.value.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          )
        })}
        <div className="pt-2 border-t mt-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">ETB {total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CONTENT PARSER
// ============================================================================

function parseContent(content: string): ParsedContent {
  const widgets: Widget[] = []
  const widgetRegex = /```widget:(stats|list|progress|card|form|chart|table|alert|timeline|comparison|metric|action|gauge|sparkline|kpicard|distribution)\n([\s\S]*?)```/g
  let cleanedText = content

  let match
  while ((match = widgetRegex.exec(content)) !== null) {
    const [fullMatch, type, jsonStr] = match
    try {
      const data = JSON.parse(jsonStr.trim())
      switch (type) {
        case 'stats':
          widgets.push({ type: 'stats', items: data.items || [] })
          break
        case 'list':
          widgets.push({ type: 'list', title: data.title, items: data.items || [] })
          break
        case 'progress':
          widgets.push({ type: 'progress', ...data })
          break
        case 'card':
          widgets.push({ type: 'card', title: data.title, items: data.items || [] })
          break
        case 'form':
          widgets.push({ type: 'form', title: data.title, fields: data.fields || [] })
          break
        case 'chart':
          widgets.push({ type: 'chart', chartType: data.chartType || 'bar', title: data.title, data: data.data || [] })
          break
        case 'table':
          widgets.push({ type: 'table', title: data.title, headers: data.headers || [], rows: data.rows || [] })
          break
        case 'alert':
          widgets.push({ type: 'alert', variant: data.variant || 'info', title: data.title, message: data.message || '' })
          break
        case 'timeline':
          widgets.push({ type: 'timeline', title: data.title, events: data.events || [] })
          break
        case 'comparison':
          widgets.push({ type: 'comparison', title: data.title, items: data.items || [] })
          break
        case 'metric':
          widgets.push({ type: 'metric', value: data.value, label: data.label, description: data.description, trend: data.trend, trendValue: data.trendValue })
          break
        case 'action':
          widgets.push({ type: 'action', title: data.title, actions: data.actions || [] })
          break
        // New widget types
        case 'gauge':
          widgets.push({ type: 'gauge', value: data.value || 0, max: data.max || 100, label: data.label || '', thresholds: data.thresholds })
          break
        case 'sparkline':
          widgets.push({ type: 'sparkline', title: data.title || '', data: data.data || [], trend: data.trend || 'neutral', currentValue: data.currentValue || '' })
          break
        case 'kpicard':
          widgets.push({ type: 'kpicard', icon: data.icon || 'dollar', label: data.label || '', value: data.value || '', trend: data.trend, color: data.color })
          break
        case 'distribution':
          widgets.push({ type: 'distribution', title: data.title || '', items: data.items || [] })
          break
      }
    } catch {
      // Keep the original text if JSON parsing fails
    }
    cleanedText = cleanedText.replace(fullMatch, '')
  }

  return { text: cleanedText.trim(), widgets }
}

function RenderWidget({
  widget,
  onFormSubmit,
  onAction
}: {
  widget: Widget
  onFormSubmit?: (data: Record<string, string>) => void
  onAction?: (actionId: string) => void
}) {
  switch (widget.type) {
    case 'stats':
      return <StatsWidgetComponent items={widget.items} />
    case 'list':
      return <ListWidgetComponent title={widget.title} items={widget.items} />
    case 'progress':
      return <ProgressWidgetComponent {...widget} />
    case 'card':
      return <CardWidgetComponent title={widget.title} items={widget.items} />
    case 'form':
      return (
        <FormWidgetComponent
          title={widget.title}
          fields={widget.fields}
          onSubmit={onFormSubmit || (() => {})}
        />
      )
    case 'chart':
      return <ChartWidgetComponent chartType={widget.chartType} title={widget.title} data={widget.data} />
    case 'table':
      return <TableWidgetComponent title={widget.title} headers={widget.headers} rows={widget.rows} />
    case 'alert':
      return <AlertWidgetComponent variant={widget.variant} title={widget.title} message={widget.message} />
    case 'timeline':
      return <TimelineWidgetComponent title={widget.title} events={widget.events} />
    case 'comparison':
      return <ComparisonWidgetComponent title={widget.title} items={widget.items} />
    case 'metric':
      return <MetricWidgetComponent {...widget} />
    case 'action':
      return <ActionWidgetComponent title={widget.title} actions={widget.actions} onAction={onAction} />
    // New widget types
    case 'gauge':
      return <GaugeWidgetComponent value={widget.value} max={widget.max} label={widget.label} thresholds={widget.thresholds} />
    case 'sparkline':
      return <SparklineWidgetComponent title={widget.title} data={widget.data} trend={widget.trend} currentValue={widget.currentValue} />
    case 'kpicard':
      return <KPICardWidgetComponent icon={widget.icon} label={widget.label} value={widget.value} trend={widget.trend} color={widget.color} />
    case 'distribution':
      return <DistributionWidgetComponent title={widget.title} items={widget.items} />
    default:
      return null
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Speech Recognition types for TypeScript
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent
  error: SpeechRecognitionErrorEvent
  end: Event
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
  readonly resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface
    webkitSpeechRecognition: new () => SpeechRecognitionInterface
  }
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<A2UIMessage[]>([INITIAL_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null)
  const pathname = usePathname()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  // Setup speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setVoiceSupported(true)
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognitionClass()

      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setInputValue(transcript)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
      }
    }
  }, [isListening])

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim() || isLoading) return

    const userMessage: A2UIMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      status: 'sent',
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Filter out the initial welcome message (id: 'welcome') before sending to API
      const chatHistory = [...messages, userMessage]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      })

      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        status: 'sent',
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
        status: 'error',
      }])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFormSubmit = (data: Record<string, string>) => {
    // Format form data as a readable message
    const entries = Object.entries(data).filter(([, value]) => value && value.trim())
    if (entries.length === 0) return

    const formattedData = entries
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    handleSendMessage(`Here is my information: ${formattedData}. Please analyze this data.`)
  }

  const suggestions = useMemo(() => {
    if (!pathname) return SUGGESTIONS['default']
    if (SUGGESTIONS[pathname]) return SUGGESTIONS[pathname]
    const parentKey = Object.keys(SUGGESTIONS).find(k => k !== 'default' && pathname.startsWith(k))
    return parentKey ? SUGGESTIONS[parentKey] : SUGGESTIONS['default']
  }, [pathname])

  // Floating button
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden transition-all duration-300",
        isExpanded
          ? "bottom-4 right-4 w-[560px] h-[85vh] max-h-[800px]"
          : "bottom-6 right-6 w-[380px] h-[540px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">SageFlow AI</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMessages([INITIAL_MESSAGE])}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const parsed = message.role === 'assistant' ? parseContent(message.content) : null

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                  {message.role === 'assistant' ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className={cn(
                "flex flex-col max-w-[85%]",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                {message.role === 'user' ? (
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-primary text-primary-foreground">
                    {message.content}
                  </div>
                ) : (
                  <div className="space-y-1 w-full">
                    {parsed?.text && (
                      <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed bg-muted">
                        <div className="whitespace-pre-wrap">{parsed.text}</div>
                      </div>
                    )}
                    {parsed?.widgets.map((widget, i) => (
                      <RenderWidget key={i} widget={widget} onFormSubmit={handleFormSubmit} />
                    ))}
                    {!parsed?.text && !parsed?.widgets.length && (
                      <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed bg-muted">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t space-y-3">
        {/* Suggestions */}
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-3 text-xs"
                onClick={() => handleSendMessage(s.prompt)}
              >
                <Lightbulb className="h-3 w-3 mr-1.5" />
                {s.label}
              </Button>
            ))}
          </div>
        )}

        {/* Input field */}
        <div className="flex items-end gap-2 bg-muted rounded-lg p-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask about accounting, taxes, invoices..."}
            className={cn(
              "flex-1 min-h-[24px] max-h-28 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 px-2 py-1 text-sm placeholder:text-muted-foreground",
              isListening && "placeholder:text-red-500 placeholder:animate-pulse"
            )}
            rows={1}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 112)}px`
            }}
          />
          {voiceSupported && (
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-9 w-9 shrink-0 transition-colors",
                isListening && "text-red-500 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
              )}
              onClick={toggleVoiceInput}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          {voiceSupported ? 'Powered by Gemini • Voice enabled • ' : 'Powered by Gemini • '}Verify data before making financial decisions
        </p>
      </div>
    </Card>
  )
}
