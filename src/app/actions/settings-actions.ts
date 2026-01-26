/**
 * Settings Actions - Manage application settings and API keys
 */

import type { ActionResult } from "@/types/api"

// API key status type
export interface ApiKeyStatus {
  geminiConfigured: boolean
  chapaConfigured: boolean
  resendConfigured: boolean
  lastUpdated?: string
}

// Masked API keys type
export interface MaskedApiKeys {
  geminiApiKey?: string
  chapaSecretKey?: string
  resendApiKey?: string
}

// Storage key for settings
const SETTINGS_KEY = 'sageflow_settings'

/**
 * Get API key configuration status
 */
export async function getApiKeyStatus(): Promise<ActionResult<ApiKeyStatus>> {
  try {
    // Check environment variables (set in .env.local)
    const status: ApiKeyStatus = {
      geminiConfigured: !!import.meta.env.VITE_GEMINI_API_KEY,
      chapaConfigured: !!import.meta.env.VITE_CHAPA_SECRET_KEY,
      resendConfigured: !!import.meta.env.VITE_RESEND_API_KEY,
    }

    // Also check localStorage for user-provided keys
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        if (settings.apiKeys) {
          status.geminiConfigured = status.geminiConfigured || !!settings.apiKeys.geminiApiKey
          status.chapaConfigured = status.chapaConfigured || !!settings.apiKeys.chapaSecretKey
          status.resendConfigured = status.resendConfigured || !!settings.apiKeys.resendApiKey
          status.lastUpdated = settings.apiKeys.lastUpdated
        }
      } catch {
        // Ignore parse errors
      }
    }

    return { success: true, data: status }
  } catch (error) {
    return { success: false, error: 'Failed to get API key status' }
  }
}

/**
 * Get masked versions of API keys for display
 */
export async function getMaskedApiKeys(): Promise<ActionResult<MaskedApiKeys>> {
  try {
    const maskKey = (key?: string) => {
      if (!key) return undefined
      if (key.length <= 8) return '****'
      return key.slice(0, 4) + '****' + key.slice(-4)
    }

    const stored = localStorage.getItem(SETTINGS_KEY)
    const settings = stored ? JSON.parse(stored) : {}

    return {
      success: true,
      data: {
        geminiApiKey: maskKey(settings.apiKeys?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY),
        chapaSecretKey: maskKey(settings.apiKeys?.chapaSecretKey || import.meta.env.VITE_CHAPA_SECRET_KEY),
        resendApiKey: maskKey(settings.apiKeys?.resendApiKey || import.meta.env.VITE_RESEND_API_KEY),
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get masked API keys' }
  }
}

/**
 * Save API keys to localStorage
 * Note: In production, these should be server-side environment variables
 */
export async function saveApiKeys(keys: {
  geminiApiKey?: string
  chapaSecretKey?: string
  resendApiKey?: string
}): Promise<ActionResult<void>> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    const settings = stored ? JSON.parse(stored) : {}

    settings.apiKeys = {
      ...settings.apiKeys,
      ...Object.fromEntries(
        Object.entries(keys).filter(([_, v]) => v !== undefined && v !== '')
      ),
      lastUpdated: new Date().toISOString()
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to save API keys' }
  }
}

/**
 * Clear a specific API key
 */
export async function clearApiKey(
  keyName: 'geminiApiKey' | 'chapaSecretKey' | 'resendApiKey'
): Promise<ActionResult<void>> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const settings = JSON.parse(stored)
      if (settings.apiKeys) {
        delete settings.apiKeys[keyName]
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to clear API key' }
  }
}

/**
 * Get all application settings
 */
export async function getSettings(): Promise<ActionResult<{
  dateFormat: string
  currency: string
  timezone: string
  language: string
}>> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    const settings = stored ? JSON.parse(stored) : {}

    return {
      success: true,
      data: {
        dateFormat: settings.dateFormat || 'DD/MM/YYYY',
        currency: settings.currency || 'ETB',
        timezone: settings.timezone || 'Africa/Addis_Ababa',
        language: settings.language || 'en',
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to get settings' }
  }
}

/**
 * Update application settings
 */
export async function updateSettings(updates: {
  dateFormat?: string
  currency?: string
  timezone?: string
  language?: string
}): Promise<ActionResult<void>> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    const settings = stored ? JSON.parse(stored) : {}

    Object.assign(settings, updates)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update settings' }
  }
}
