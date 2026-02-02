/**
 * License Activation Component
 *
 * Shows license status and allows activation
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import {
  Shield,
  Key,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Copy
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  checkLicenseStatus,
  validateLicense,
  getTrialDaysRemaining,
  startTrial,
  getMachineFingerprint,
  type LicenseInfo,
  type LicenseValidation
} from '@/lib/license/license-manager'

interface LicenseActivationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onActivated?: (license: LicenseInfo) => void
}

export function LicenseActivation({ open, onOpenChange, onActivated }: LicenseActivationProps) {
  const { toast } = useToast()
  const [licenseKey, setLicenseKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [machineId, setMachineId] = useState('')
  const [status, setStatus] = useState<LicenseValidation | null>(null)

  useEffect(() => {
    if (open) {
      loadStatus()
      loadMachineId()
    }
  }, [open])

  async function loadStatus() {
    const result = await checkLicenseStatus()
    setStatus(result)
  }

  async function loadMachineId() {
    const id = await getMachineFingerprint()
    setMachineId(id)
  }

  async function handleActivate() {
    if (!licenseKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a license key',
        variant: 'destructive'
      })
      return
    }

    setIsValidating(true)
    try {
      const result = await validateLicense(licenseKey.trim())

      if (result.valid && result.license) {
        toast({
          title: 'License Activated!',
          description: `${result.license.type.charAt(0).toUpperCase() + result.license.type.slice(1)} license activated successfully.`
        })
        setStatus(result)
        onActivated?.(result.license)
        onOpenChange(false)
      } else {
        toast({
          title: 'Invalid License',
          description: result.error || 'The license key is invalid.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Activation Failed',
        description: 'Could not validate license. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsValidating(false)
    }
  }

  function handleStartTrial() {
    startTrial()
    loadStatus()
    toast({
      title: 'Trial Started!',
      description: `You have ${getTrialDaysRemaining()} days to try SageFlow.`
    })
    onOpenChange(false)
  }

  function copyMachineId() {
    navigator.clipboard.writeText(machineId)
    toast({
      title: 'Copied!',
      description: 'Machine ID copied to clipboard'
    })
  }

  function formatLicenseKey(value: string): string {
    // Remove non-alphanumeric
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    // Add dashes every 4 characters
    const parts = clean.match(/.{1,4}/g) || []
    return parts.slice(0, 4).join('-')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            License Activation
          </DialogTitle>
          <DialogDescription>
            Enter your license key to unlock all features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          {status && (
            <Card className={status.valid ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {status.valid ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {status.valid ? (
                        <>
                          {status.license?.type === 'trial' ? 'Trial Active' : `${status.license?.type.charAt(0).toUpperCase()}${status.license?.type.slice(1)} License`}
                        </>
                      ) : (
                        'No Active License'
                      )}
                    </p>
                    {status.daysRemaining !== undefined && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {status.daysRemaining} days remaining
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* License Key Input */}
          <div className="space-y-2">
            <Label htmlFor="license-key">License Key</Label>
            <Input
              id="license-key"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(formatLicenseKey(e.target.value))}
              className="font-mono text-center tracking-wider"
              maxLength={19}
            />
          </div>

          {/* Machine ID */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Machine ID (for support)</Label>
            <div className="flex gap-2">
              <Input
                value={machineId}
                readOnly
                className="font-mono text-xs bg-slate-50 dark:bg-slate-900"
              />
              <Button variant="outline" size="icon" onClick={copyMachineId}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleActivate}
              disabled={isValidating || !licenseKey.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Activate License
                </>
              )}
            </Button>

            {(!status?.valid || status?.license?.type === 'trial') && (
              <Button
                variant="outline"
                onClick={handleStartTrial}
                className="w-full"
              >
                <Clock className="w-4 h-4 mr-2" />
                Start 14-Day Free Trial
              </Button>
            )}
          </div>

          {/* Purchase Link */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Need a license?{' '}
            <a
              href="https://sageflow.app/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              View pricing plans
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * License Status Badge
 * Shows current license status in a compact format
 */
export function LicenseStatusBadge() {
  const [status, setStatus] = useState<LicenseValidation | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    checkLicenseStatus().then(setStatus)
  }, [])

  if (!status) return null

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors
          ${status.valid
            ? status.license?.type === 'trial'
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
          }
        `}
      >
        {status.valid ? (
          status.license?.type === 'trial' ? (
            <>
              <Clock className="w-3 h-3" />
              Trial: {status.daysRemaining}d
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3" />
              Licensed
            </>
          )
        ) : (
          <>
            <AlertTriangle className="w-3 h-3" />
            Unlicensed
          </>
        )}
      </button>

      <LicenseActivation
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  )
}
