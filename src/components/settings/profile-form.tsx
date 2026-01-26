'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
// import { useUser } from '@/hooks/use-user' // Assuming this exists or using simple auth

const profileFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // Mock initial data - ideally from hook
  const defaultValues: ProfileFormValues = {
    fullName: 'Demo User',
    email: 'demo@example.com',
    phone: '',
    jobTitle: 'Administrator',
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  })

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated.",
      })
      console.log('Updated profile:', data)
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator />
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Full Name</Label>
                <Input {...form.register('fullName')} />
                {form.formState.errors.fullName && (
                    <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Email</Label>
                <Input {...form.register('email')} disabled />
                <p className="text-[0.8rem] text-muted-foreground">Email address cannot be changed directly.</p>
            </div>

            <div className="space-y-2">
                <Label>Job Title</Label>
                <Input {...form.register('jobTitle')} />
            </div>

            <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input {...form.register('phone')} />
            </div>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update profile
        </Button>
      </form>
    </div>
  )
}
