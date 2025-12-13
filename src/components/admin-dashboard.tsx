import { motion } from 'framer-motion'
import {
  Users,
  CreditCard,
  Bell,
  ChartLine,
  UserCircle,
  ShieldCheck,
  Trash,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useKV } from '@/hooks/use-kv'
import { useState, useEffect } from 'react'

interface AdminUser {
  id: string
  name: string
  email: string
  subscription: 'free' | 'premium' | 'family'
  status: 'active' | 'suspended'
  joinedDate: string
  devicesCount: number
  lastActive: string
}

export function AdminDashboard() {
  const [users, setUsers] = useKV<AdminUser[]>('flowsphere-admin-users', [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      subscription: 'premium',
      status: 'active',
      joinedDate: '2024-01-15',
      devicesCount: 12,
      lastActive: '2 minutes ago',
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael@example.com',
      subscription: 'family',
      status: 'active',
      joinedDate: '2024-02-20',
      devicesCount: 18,
      lastActive: '1 hour ago',
    },
    {
      id: '3',
      name: 'Emma Williams',
      email: 'emma@example.com',
      subscription: 'free',
      status: 'active',
      joinedDate: '2024-03-10',
      devicesCount: 3,
      lastActive: '5 hours ago',
    },
    {
      id: '4',
      name: 'James Brown',
      email: 'james@example.com',
      subscription: 'premium',
      status: 'suspended',
      joinedDate: '2023-11-05',
      devicesCount: 8,
      lastActive: '2 days ago',
    },
  ])

  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const user = await window.spark.user()
        setIsOwner(user?.isOwner || false)
      } catch (error) {
        setIsOwner(false)
      }
    }
    checkOwnership()
  }, [])

  const stats = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter(u => u.status === 'active').length || 0,
    premiumUsers:
      users?.filter(u => u.subscription === 'premium' || u.subscription === 'family').length || 0,
    totalRevenue:
      (users?.filter(u => u.subscription === 'premium').length || 0) * 9.99 +
      (users?.filter(u => u.subscription === 'family').length || 0) * 19.99,
  }

  const handleSuspendUser = (userId: string) => {
    setUsers(currentUsers =>
      (currentUsers || []).map(user =>
        user.id === userId
          ? { ...user, status: user.status === 'active' ? 'suspended' : 'active' }
          : user
      )
    )
    toast.success('User status updated')
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(currentUsers => (currentUsers || []).filter(user => user.id !== userId))
    toast.success('User deleted')
  }

  const getSubscriptionBadge = (subscription: string) => {
    switch (subscription) {
      case 'premium':
        return <Badge className="bg-accent text-accent-foreground">Premium</Badge>
      case 'family':
        return <Badge className="bg-coral text-coral-foreground">Family</Badge>
      default:
        return <Badge variant="secondary">Free</Badge>
    }
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldCheck
              className="w-16 h-16 mx-auto mb-4 text-muted-foreground"
              weight="duotone"
            />
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              You need administrator privileges to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage users, subscriptions, and view analytics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" weight="duotone" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.activeUsers} active</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" weight="duotone" />
                Premium Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.premiumUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% conversion
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ChartLine className="w-4 h-4" weight="duotone" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" weight="duotone" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Online now</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">User</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">
                    Subscription
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Devices</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                    Last Active
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users || []).map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="py-2 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                          <AvatarFallback className="text-xs sm:text-sm">
                            {user.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-xs sm:text-sm">{user.name}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getSubscriptionBadge(user.subscription)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                      {user.devicesCount} devices
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'default' : 'destructive'}
                        className="text-[10px] sm:text-xs"
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs sm:text-sm text-muted-foreground">
                      {user.lastActive}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendUser(user.id)}
                          className="text-xs min-touch-target"
                        >
                          <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline ml-1">
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                          </span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-xs min-touch-target"
                        >
                          <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline ml-1">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
