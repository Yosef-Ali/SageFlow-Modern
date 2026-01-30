'use client'

import { useState } from 'react'
import { 
  Plus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Trash2, 
  UserPlus, 
  Loader2,
  CheckCircle2,
  XCircle,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers } from '@/hooks/use-users'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-context'

export function UserManagement() {
  const { user: currentUser } = useAuth()
  const { users, isLoading, invite, changeRole, removeUser } = useUsers()
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'EMPLOYEE' })
  const [isInviting, setIsInviting] = useState(false)

  const handleInvite = async () => {
    setIsInviting(true)
    const result = await invite(inviteData.email, inviteData.name, inviteData.role)
    if (result.success) {
      setIsInviteDialogOpen(false)
      setInviteData({ name: '', email: '', role: 'EMPLOYEE' })
    }
    setIsInviting(false)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Admin</Badge>
      case 'ACCOUNTANT': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Accountant</Badge>
      case 'MANAGER': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Manager</Badge>
      default: return <Badge variant="outline">Employee</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your team members and their access levels.
          </p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite a new user</DialogTitle>
              <DialogDescription>
                Send an invitation to join your company on SageFlow.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={inviteData.name}
                  onChange={e => setInviteData({...inviteData, name: e.target.value})}
                  placeholder="John Doe" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={inviteData.email}
                  onChange={e => setInviteData({...inviteData, email: e.target.value})}
                  placeholder="john@example.com" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={inviteData.role}
                  onValueChange={value => setInviteData({...inviteData, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="group hover:bg-muted/20 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-primary/5 text-primary">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{u.name || 'No Name'}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                    {u.id === currentUser?.id && (
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4">You</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getRoleBadge(u.role)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => changeRole(u.id, 'ADMIN')}>
                        <Shield className="mr-2 h-4 w-4" /> Change to Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => changeRole(u.id, 'ACCOUNTANT')}>
                        <Shield className="mr-2 h-4 w-4" /> Change to Accountant
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => changeRole(u.id, 'EMPLOYEE')}>
                        <Shield className="mr-2 h-4 w-4" /> Change to Employee
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => removeUser(u.id)}
                        disabled={u.id === currentUser?.id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 flex gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">Access Control</p>
          <p>
            Users with the <strong>Admin</strong> role can manage company settings and other users. 
            <strong> Accountants</strong> have full access to financial data but cannot change company settings.
            <strong> Employees</strong> can create and view records assigned to them.
          </p>
        </div>
      </div>
    </div>
  )
}
