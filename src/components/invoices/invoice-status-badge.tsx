'use client'

import { InvoiceStatus } from '@/db/schema'
import { invoiceStatusColors, invoiceStatusLabels } from '@/types/invoice'
import { cn } from '@/lib/utils'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const colors = invoiceStatusColors[status] || invoiceStatusColors.DRAFT
  const label = invoiceStatusLabels[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {label}
    </span>
  )
}
