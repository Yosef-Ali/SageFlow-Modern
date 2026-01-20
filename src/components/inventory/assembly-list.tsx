'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Hammer, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { buildAssembly } from '@/app/actions/inventory-actions'

interface AssemblyListProps {
  assemblies: any[]
}

export function AssemblyList({ assemblies }: AssemblyListProps) {
  const [selectedAssembly, setSelectedAssembly] = useState<any>(null)
  const [buildQty, setBuildQty] = useState(1)
  const [isBuilding, setIsBuilding] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleBuildClick = (assembly: any) => {
    setSelectedAssembly(assembly)
    setBuildQty(Number(assembly.yieldQuantity) || 1)
    setIsDialogOpen(true)
  }

  const handleConfirmBuild = async () => {
    if (!selectedAssembly) return
    setIsBuilding(true)
    try {
      const result = await buildAssembly({
        assemblyId: selectedAssembly.id,
        quantity: buildQty,
        date: new Date()
      })

      if (result.success) {
        alert('Assembly built successfully!')
        setIsDialogOpen(false)
      } else {
        alert(result.error || 'Failed to build assembly')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred')
    } finally {
      setIsBuilding(false)
    }
  }

  if (assemblies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-slate-200">
        <h3 className="text-lg font-medium text-slate-900 mb-1">No Assemblies Defined</h3>
        <p className="text-slate-500 mb-4">Create your first Bill of Materials to start building items.</p>
        <Link href="/dashboard/inventory/assemblies/new">
          <Button>Create Assembly</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Yield</TableHead>
            <TableHead>Components</TableHead>
            <TableHead>Defined On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assemblies.map((assembly) => (
            <TableRow key={assembly.id}>
              <TableCell className="font-medium">
                {assembly.item.name} <span className="text-slate-500 text-xs">({assembly.item.sku})</span>
              </TableCell>
              <TableCell>{assembly.description || '-'}</TableCell>
              <TableCell>{Number(assembly.yieldQuantity)}</TableCell>
              <TableCell>
                <span className="text-xs text-slate-500">
                    {assembly.components.length} components
                </span>
              </TableCell>
              <TableCell>{formatDate(new Date(assembly.createdAt))}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBuildClick(assembly)}>
                      <Hammer className="h-4 w-4 mr-2" />
                      Build Item
                    </DropdownMenuItem>
                    {/* Add Edit/Delete later if needed */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Build Assembly: {selectedAssembly?.item.name}</DialogTitle>
                <DialogDescription>
                    This will increase stock for {selectedAssembly?.item.name} and deduct stock from components.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Quantity to Build</Label>
                    <Input 
                        type="number" 
                        min="1" 
                        value={buildQty} 
                        onChange={(e) => setBuildQty(Number(e.target.value))}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmBuild} disabled={isBuilding}>
                    {isBuilding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Build
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
