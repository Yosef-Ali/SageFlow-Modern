import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Building2,
  Users,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useVendors, useVendorsSummary, useDeleteVendor } from '@/hooks/use-vendors'
import { vendorTypes, paymentTerms } from '@/lib/validations/vendor'

export default function VendorsPage() {
  const [search, setSearch] = useState('')

  const { data: vendors, isLoading } = useVendors({ search: search || undefined })
  const { data: summary, isLoading: summaryLoading } = useVendorsSummary()
  const deleteVendor = useDeleteVendor()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteVendor.mutateAsync(deleteId)
      setDeleteId(null)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
    }).format(value)
  }

  const getTypeLabel = (type: string | undefined) => {
    const t = vendorTypes.find(v => v.value === type)
    return t?.label || 'Supplier'
  }

  const getTermsLabel = (terms: string | undefined) => {
    const t = paymentTerms.find(p => p.value === terms)
    return t?.label || 'Net 30'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-1">Manage your suppliers and vendors</p>
        </div>
        <Link to="/dashboard/vendors/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {summaryLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Total Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.total || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  Active Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.active || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                  Total Payable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalBalance || 0)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vendors Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Vendor #</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Terms</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Balance</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                </tr>
              ))
            ) : vendors && vendors.length > 0 ? (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{vendor.vendorNumber}</td>
                  <td className="px-6 py-4">
                    <Link to={`/dashboard/vendors/${vendor.id}`} className="font-medium hover:underline">
                      {vendor.name}
                    </Link>
                    {vendor.contactName && (
                      <p className="text-xs text-slate-500">{vendor.contactName}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded">
                      {getTypeLabel(vendor.vendorType ?? undefined)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-muted/50 text-muted-foreground rounded">
                      {getTermsLabel(vendor.paymentTerms ?? undefined)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(parseFloat(vendor.balance || '0'))}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/dashboard/vendors/${vendor.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(vendor.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No vendors found</p>
                  <p className="text-slate-400 text-sm mt-1">Add your first vendor to get started</p>
                  <Link to="/dashboard/vendors/new">
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vendor
                    </Button>
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the vendor as inactive. They will no longer appear in new purchase orders or search results, but their transaction history will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
