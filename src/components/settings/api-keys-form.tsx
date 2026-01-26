
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Key, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { getApiKeyStatus, getMaskedApiKeys, saveApiKeys, clearApiKey, type ApiKeyStatus } from '@/app/actions/settings-actions'

interface ApiKeyInputProps {
  label: string
  description: string
  value: string
  maskedValue?: string
  isConfigured: boolean
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
}

function ApiKeyInput({
  label,
  description,
  value,
  maskedValue,
  isConfigured,
  onChange,
  onClear,
  placeholder,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={isConfigured ? 'default' : 'secondary'} className="ml-2">
          {isConfigured ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Configured
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 mr-1" />
              Not Set
            </>
          )}
        </Badge>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={maskedValue || placeholder}
            className="pr-10 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {isConfigured && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClear}
            title="Clear this API key"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function ApiKeysForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [maskedKeys, setMaskedKeys] = useState<{ geminiApiKey?: string; chapaSecretKey?: string }>({})
  
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [chapaSecretKey, setChapaSecretKey] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [statusResult, maskedResult] = await Promise.all([
          getApiKeyStatus(),
          getMaskedApiKeys(),
        ])
        
        if (statusResult.success && statusResult.data) {
          setStatus(statusResult.data)
        }
        if (maskedResult.success && maskedResult.data) {
          setMaskedKeys(maskedResult.data)
        }
      } catch (error) {
        console.error('Failed to load API key status:', error)
        toast({
          title: 'Error',
          description: 'Failed to load API key configuration',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [toast])

  const handleSave = async () => {
    if (!geminiApiKey && !chapaSecretKey) {
      toast({
        title: 'No changes',
        description: 'Enter at least one API key to save',
        variant: 'default',
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await saveApiKeys({
        geminiApiKey: geminiApiKey || undefined,
        chapaSecretKey: chapaSecretKey || undefined,
      })

      if (result.success) {
        toast({
          title: 'API Keys Saved',
          description: 'Your API keys have been securely saved',
        })
        // Clear inputs and reload status
        setGeminiApiKey('')
        setChapaSecretKey('')
        const [statusResult, maskedResult] = await Promise.all([
          getApiKeyStatus(),
          getMaskedApiKeys(),
        ])
        if (statusResult.success && statusResult.data) {
          setStatus(statusResult.data)
        }
        if (maskedResult.success && maskedResult.data) {
          setMaskedKeys(maskedResult.data)
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save API keys',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async (keyName: 'geminiApiKey' | 'chapaSecretKey') => {
    try {
      const result = await clearApiKey(keyName)
      if (result.success) {
        toast({
          title: 'API Key Cleared',
          description: `The ${keyName === 'geminiApiKey' ? 'Gemini' : 'Chapa'} API key has been removed`,
        })
        // Reload status
        const [statusResult, maskedResult] = await Promise.all([
          getApiKeyStatus(),
          getMaskedApiKeys(),
        ])
        if (statusResult.success && statusResult.data) {
          setStatus(statusResult.data)
        }
        if (maskedResult.success && maskedResult.data) {
          setMaskedKeys(maskedResult.data)
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear API key',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI Integration
          </CardTitle>
          <CardDescription>
            Configure your Gemini API key to enable AI-powered features like the AI Assistant, smart insights, and invoice scanning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyInput
            label="Gemini API Key"
            description="Get your API key from Google AI Studio"
            value={geminiApiKey}
            maskedValue={maskedKeys.geminiApiKey}
            isConfigured={status?.geminiConfigured || false}
            onChange={setGeminiApiKey}
            onClear={() => handleClear('geminiApiKey')}
            placeholder="AIza..."
          />
        </CardContent>
      </Card>

      {/* Payment Gateway */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Payment Gateway
          </CardTitle>
          <CardDescription>
            Configure your Chapa payment gateway credentials to enable online payment collection from customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyInput
            label="Chapa Secret Key"
            description="Get your secret key from your Chapa dashboard"
            value={chapaSecretKey}
            maskedValue={maskedKeys.chapaSecretKey}
            isConfigured={status?.chapaConfigured || false}
            onChange={setChapaSecretKey}
            onClear={() => handleClear('chapaSecretKey')}
            placeholder="CHASECK_TEST-..."
          />
        </CardContent>
      </Card>

      {/* Last Updated */}
      {status?.lastUpdated && (
        <p className="text-sm text-muted-foreground text-center">
          Last updated: {new Date(status.lastUpdated).toLocaleString()}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard/settings')}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save API Keys
        </Button>
      </div>
    </div>
  )
}
