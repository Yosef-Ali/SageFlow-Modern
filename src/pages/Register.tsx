import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, TrendingUp } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

function RegisterForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { register: registerUser } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
    },
  })

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)

    try {
      const result = await registerUser(data.email, data.password, data.name, data.companyName)

      if (result.success) {
        navigate('/login', { replace: true })
        toast({
          title: "Account created!",
          description: "You can now sign in with your credentials.",
        })
      } else {
        toast({
          title: "Registration failed",
          description: result.error || "Could not create account. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Mobile Logo */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-foreground">SageFlow</span>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">Create an account</h2>
        <p className="mt-2 text-muted-foreground">
          Start managing your finances today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="Abebe Kebede"
            autoComplete="name"
            disabled={isLoading}
            {...register('name')}
            className={errors.name ? 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500' : 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500'}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Abebe Trading PLC"
            disabled={isLoading}
            {...register('companyName')}
            className={errors.companyName ? 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500' : 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500'}
          />
          {errors.companyName && (
            <p className="text-sm text-red-500">{errors.companyName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
            className={errors.email ? 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500' : 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500'}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              {...register('password')}
              className={errors.password ? 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500 pr-10' : 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500 pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500 pr-10' : 'bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-emerald-500 pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-emerald-600 hover:text-emerald-500"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">SageFlow</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join the Future<br />
            of Ethiopian<br />
            Business
          </h1>
          <p className="text-lg text-slate-400 max-w-md">
            Get started with SageFlow today. Compliance, inventory, and comprehensive reporting at your fingertips.
          </p>
          
          {/* Testimonial */}
          <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
            <p className="text-slate-300 italic mb-4">
              "SageFlow made our VAT filing process incredibly simple. It's exactly what we needed."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xs">
                AK
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Abebe Kebede</div>
                <div className="text-xs text-slate-500">General Manager, Horizon Trading</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm">
          © 2026 SageFlow. All rights reserved.
        </p>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <RegisterForm />
      </div>
    </div>
  )
}
