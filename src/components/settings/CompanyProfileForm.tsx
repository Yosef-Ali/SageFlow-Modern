'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, Building2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useCompany } from '@/hooks/use-company'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { uploadCompanyLogo } from '@/app/actions/storage-actions'
import { useToast } from '@/components/ui/use-toast'

const companyFormSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  currency: z.string().min(3, 'Currency is required'),
  logo_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
})

type CompanyFormValues = z.infer<typeof companyFormSchema>

export function CompanyProfileForm() {
  const { toast } = useToast()
  const { company, isLoading, updateProfile, fetchCompany } = useCompany()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      currency: 'ETB',
      logo_url: '',
    },
  })

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        tax_id: company.tax_id || '',
        currency: company.currency || 'ETB',
        logo_url: company.logo_url || '',
      })
    }
  }, [company, form])

  async function onSubmit(data: CompanyFormValues) {
    setIsSubmitting(true)
    await updateProfile(data)
    setIsSubmitting(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 2MB.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    const result = await uploadCompanyLogo(file)
    if (result.success) {
      toast({
        title: "Logo updated",
        description: "Your company logo has been updated successfully."
      })
      await fetchCompany() // Refresh company data to show new logo
    } else {
      toast({
        title: "Upload failed",
        description: result.error,
        variant: "destructive"
      })
    }
    setIsUploading(false)
  }

  const handleRemoveLogo = async () => {
    if (!company) return
    
    setIsUploading(true)
    const result = await updateProfile({ logo_url: null })
    if (result?.success) {
      form.setValue('logo_url', '')
      toast({
        title: "Logo removed",
        description: "Your company logo has been removed."
      })
    }
    setIsUploading(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-32 h-32 rounded-lg border-2 border-border shadow-sm">
            <AvatarImage src={company?.logo_url || ''} />
            <AvatarFallback className="rounded-lg bg-primary/10">
              <Building2 className="w-12 h-12 text-primary/40" />
            </AvatarFallback>
          </Avatar>
          <div className="w-full space-y-2">
            <input
              type="file"
              id="logo-upload"
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={isUploading}
            />
            <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
                disabled={isUploading}
            >
                <label htmlFor="logo-upload" className="cursor-pointer flex items-center justify-center">
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isUploading ? 'Uploading...' : 'Upload'}
                </label>
            </Button>
            {company?.logo_url && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-destructive hover:text-destructive"
                onClick={handleRemoveLogo}
                disabled={isUploading}
                type="button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Square PNG or JPG.<br />Max 2MB.
          </p>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Company Profile</h3>
            <p className="text-sm text-muted-foreground">
              Manage your company information and identity.
            </p>
          </div>
          <Separator />
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" {...form.register('name')} placeholder="Acme Corp" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (Manual Override)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="logo_url" 
                    {...form.register('logo_url')} 
                    placeholder="https://example.com/logo.png" 
                  />
                  {form.watch('logo_url') && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => form.setValue('logo_url', '')}
                      title="Clear URL"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                {form.formState.errors.logo_url && (
                  <p className="text-xs text-destructive">{form.formState.errors.logo_url.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Company Email</Label>
                <Input id="email" {...form.register('email')} placeholder="billing@acme.com" />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...form.register('phone')} placeholder="+251 ..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID / TIN</Label>
                <Input id="tax_id" {...form.register('tax_id')} placeholder="123456789" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Base Currency</Label>
                <Input id="currency" {...form.register('currency')} placeholder="ETB" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea 
                id="address" 
                {...form.register('address')} 
                placeholder="Street address, City, Region"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
