'use server'

import { db } from '@/db'
import { companies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export interface ApiKeyStatus {
  geminiConfigured: boolean
  chapaConfigured: boolean
  lastUpdated?: string
}

export interface ApiKeySaveData {
  geminiApiKey?: string
  chapaSecretKey?: string
}

/**
 * Get the current API key configuration status
 * Returns only whether keys are configured, not the actual keys
 */
export async function getApiKeyStatus(): Promise<ActionResult<ApiKeyStatus>> {
  try {
    const companyId = await getCurrentCompanyId()

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { settings: true },
    })

    const settings = (company?.settings as Record<string, any>) || {}

    return {
      success: true,
      data: {
        geminiConfigured: !!settings.geminiApiKey,
        chapaConfigured: !!settings.chapaSecretKey,
        lastUpdated: settings.apiKeysUpdatedAt,
      },
    }
  } catch (error) {
    console.error('Failed to get API key status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get API key status',
    }
  }
}

/**
 * Get masked API keys for display
 * Shows only first 4 and last 4 characters
 */
export async function getMaskedApiKeys(): Promise<ActionResult<{ geminiApiKey?: string; chapaSecretKey?: string }>> {
  try {
    const companyId = await getCurrentCompanyId()

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { settings: true },
    })

    const settings = (company?.settings as Record<string, any>) || {}

    const maskKey = (key: string | undefined): string | undefined => {
      if (!key || key.length < 12) return key ? '••••••••' : undefined
      return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`
    }

    return {
      success: true,
      data: {
        geminiApiKey: maskKey(settings.geminiApiKey),
        chapaSecretKey: maskKey(settings.chapaSecretKey),
      },
    }
  } catch (error) {
    console.error('Failed to get masked API keys:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get API keys',
    }
  }
}

/**
 * Save API keys to company settings
 * Only updates keys that are provided (non-empty)
 */
export async function saveApiKeys(data: ApiKeySaveData): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get current settings
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { settings: true },
    })

    const currentSettings = (company?.settings as Record<string, any>) || {}

    // Only update keys that are provided
    const updatedSettings = {
      ...currentSettings,
      ...(data.geminiApiKey && { geminiApiKey: data.geminiApiKey }),
      ...(data.chapaSecretKey && { chapaSecretKey: data.chapaSecretKey }),
      apiKeysUpdatedAt: new Date().toISOString(),
    }

    // Update company settings
    await db
      .update(companies)
      .set({
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))

    revalidatePath('/dashboard/settings/api-keys')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to save API keys:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save API keys',
    }
  }
}

/**
 * Clear a specific API key
 */
export async function clearApiKey(keyName: 'geminiApiKey' | 'chapaSecretKey'): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get current settings
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { settings: true },
    })

    const currentSettings = (company?.settings as Record<string, any>) || {}

    // Remove the specified key
    const { [keyName]: _, ...updatedSettings } = currentSettings
    updatedSettings.apiKeysUpdatedAt = new Date().toISOString()

    // Update company settings
    await db
      .update(companies)
      .set({
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))

    revalidatePath('/dashboard/settings/api-keys')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to clear API key:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear API key',
    }
  }
}
