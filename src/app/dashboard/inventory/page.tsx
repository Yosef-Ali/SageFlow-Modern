'use client'

import Link from 'next/link'
import { Package, Plus, Search, Filter, AlertTriangle, BoxIcon, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ItemTable } from '@/components/inventory/item-table'
import { useItems, useInventorySummary } from '@/hooks/use-inventory'
import { formatCurrency } from '@/lib/utils'

export default function InventoryPage() {
  const { data, isLoading } = useItems()
  const { data: summary, isLoading: summaryLoading } = useInventorySummary()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-600 mt-1">
            Manage your products and stock levels
          </p>
        </div>
        <Link href="/dashboard/inventory/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Items</span>
            <BoxIcon className="h-5 w-5 text-slate-400" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-slate-900">
              {summary?.totalItems || 0}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total Value</span>
            <DollarSign className="h-5 w-5 text-slate-400" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(Number(summary?.totalValue) || 0)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Low Stock</span>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.lowStockCount || 0}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Out of Stock</span>
            <Package className="h-5 w-5 text-red-500" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-red-600">
              {summary?.outOfStockCount || 0}
            </div>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search inventory..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <ItemTable items={data?.items || []} />
      )}
    </div>
  )
}
