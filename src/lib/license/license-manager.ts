/**
 * License Manager for SageFlow Desktop
 *
 * Provides software protection through:
 * - License key validation
 * - Hardware fingerprinting
 * - Online activation (optional)
 * - Trial period management
 */

import { createHash } from 'crypto'

// ============================================
// TYPES
// ============================================

export interface LicenseInfo {
  key: string
  type: 'trial' | 'standard' | 'professional' | 'enterprise'
  isValid: boolean
  expiresAt: string | null
  activatedAt: string
  machineId: string
  maxUsers: number
  features: string[]
}

export interface LicenseValidation {
  valid: boolean
  license: LicenseInfo | null
  error?: string
  daysRemaining?: number
}

// ============================================
// HARDWARE FINGERPRINT
// ============================================

/**
 * Generate a unique machine fingerprint
 * Works in both Electron main and renderer process
 */
export async function getMachineFingerprint(): Promise<string> {
  // In Electron, we can get hardware info via IPC
  if (typeof window !== 'undefined' && (window as any).electronAPI?.getMachineId) {
    return (window as any).electronAPI.getMachineId()
  }

  // Fallback: Generate from available browser/system info
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency?.toString() || '4',
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]

  const fingerprint = components.join('|')
  return hashString(fingerprint)
}

/**
 * Hash a string using SHA-256
 */
function hashString(str: string): string {
  // Browser-compatible hashing (simple hash for fingerprint, not cryptographic)
  if (typeof window !== 'undefined') {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()
  }

  // Node.js environment
  return createHash('sha256').update(str).digest('hex').substring(0, 16).toUpperCase()
}

// ============================================
// LICENSE KEY GENERATION & VALIDATION
// ============================================

/**
 * License key format: XXXX-XXXX-XXXX-XXXX
 * Structure: [TYPE][CHECKSUM]-[FEATURES]-[EXPIRY]-[RANDOM]
 */

const LICENSE_SECRET = 'SageFlow2024SecretKey' // In production, use env variable

/**
 * Validate license key format
 */
export function validateKeyFormat(key: string): boolean {
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  return pattern.test(key.toUpperCase())
}

/**
 * Decode license key to extract info
 */
export function decodeLicenseKey(key: string): { type: string; checksum: string } | null {
  if (!validateKeyFormat(key)) return null

  const parts = key.toUpperCase().split('-')
  const typeCode = parts[0].charAt(0)

  const typeMap: Record<string, string> = {
    'T': 'trial',
    'S': 'standard',
    'P': 'professional',
    'E': 'enterprise'
  }

  return {
    type: typeMap[typeCode] || 'trial',
    checksum: parts[3]
  }
}

/**
 * Generate a valid license key (for admin use)
 */
export function generateLicenseKey(
  type: 'trial' | 'standard' | 'professional' | 'enterprise',
  machineId?: string
): string {
  const typeCode = type.charAt(0).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4)
  const random1 = Math.random().toString(36).substring(2, 6).toUpperCase()
  const random2 = Math.random().toString(36).substring(2, 6).toUpperCase()

  // Create checksum from components
  const payload = `${typeCode}${timestamp}${random1}${machineId || ''}`
  const checksum = hashString(payload + LICENSE_SECRET).substring(0, 4)

  return `${typeCode}${timestamp.slice(0, 3)}-${random1}-${random2}-${checksum}`
}

/**
 * Verify license key checksum
 */
export function verifyLicenseChecksum(key: string, machineId: string): boolean {
  if (!validateKeyFormat(key)) return false

  const parts = key.toUpperCase().split('-')
  const typeAndTime = parts[0]
  const random1 = parts[1]
  const providedChecksum = parts[3]

  // Recreate checksum
  const payload = `${typeAndTime.charAt(0)}${typeAndTime.slice(1)}${random1}${machineId}`
  const expectedChecksum = hashString(payload + LICENSE_SECRET).substring(0, 4)

  // For non-machine-locked licenses, also try without machineId
  const genericChecksum = hashString(`${typeAndTime.charAt(0)}${typeAndTime.slice(1)}${random1}` + LICENSE_SECRET).substring(0, 4)

  return providedChecksum === expectedChecksum || providedChecksum === genericChecksum
}

// ============================================
// LICENSE STORAGE
// ============================================

const LICENSE_STORAGE_KEY = 'sageflow_license'
const TRIAL_START_KEY = 'sageflow_trial_start'
const TRIAL_DAYS = 14

/**
 * Save license to local storage
 */
export function saveLicense(license: LicenseInfo): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license))
  }
}

/**
 * Load license from local storage
 */
export function loadLicense(): LicenseInfo | null {
  if (typeof localStorage === 'undefined') return null

  const stored = localStorage.getItem(LICENSE_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as LicenseInfo
  } catch {
    return null
  }
}

/**
 * Clear stored license
 */
export function clearLicense(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LICENSE_STORAGE_KEY)
  }
}

// ============================================
// TRIAL MANAGEMENT
// ============================================

/**
 * Get trial start date
 */
export function getTrialStartDate(): Date | null {
  if (typeof localStorage === 'undefined') return null

  const stored = localStorage.getItem(TRIAL_START_KEY)
  if (!stored) return null

  return new Date(stored)
}

/**
 * Start trial period
 */
export function startTrial(): Date {
  const now = new Date()
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TRIAL_START_KEY, now.toISOString())
  }
  return now
}

/**
 * Get remaining trial days
 */
export function getTrialDaysRemaining(): number {
  const startDate = getTrialStartDate()
  if (!startDate) {
    startTrial()
    return TRIAL_DAYS
  }

  const now = new Date()
  const elapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, TRIAL_DAYS - elapsed)
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(): boolean {
  return getTrialDaysRemaining() <= 0
}

// ============================================
// MAIN VALIDATION
// ============================================

/**
 * Validate a license key
 */
export async function validateLicense(key: string): Promise<LicenseValidation> {
  // Check format
  if (!validateKeyFormat(key)) {
    return {
      valid: false,
      license: null,
      error: 'Invalid license key format'
    }
  }

  // Get machine ID
  const machineId = await getMachineFingerprint()

  // Decode key
  const decoded = decodeLicenseKey(key)
  if (!decoded) {
    return {
      valid: false,
      license: null,
      error: 'Could not decode license key'
    }
  }

  // Verify checksum (basic offline validation)
  // In production, you'd also verify with a server
  const isValidChecksum = verifyLicenseChecksum(key, machineId)

  if (!isValidChecksum) {
    return {
      valid: false,
      license: null,
      error: 'Invalid license key for this machine'
    }
  }

  // Create license info
  const license: LicenseInfo = {
    key: key.toUpperCase(),
    type: decoded.type as LicenseInfo['type'],
    isValid: true,
    expiresAt: null, // Set based on license type
    activatedAt: new Date().toISOString(),
    machineId,
    maxUsers: decoded.type === 'enterprise' ? 999 : decoded.type === 'professional' ? 10 : 1,
    features: getFeaturesByType(decoded.type)
  }

  // Save license
  saveLicense(license)

  return {
    valid: true,
    license,
    daysRemaining: license.type === 'trial' ? getTrialDaysRemaining() : undefined
  }
}

/**
 * Get features by license type
 */
function getFeaturesByType(type: string): string[] {
  const features: Record<string, string[]> = {
    trial: ['basic_accounting', 'invoicing', 'reports'],
    standard: ['basic_accounting', 'invoicing', 'reports', 'csv_import', 'csv_export'],
    professional: ['basic_accounting', 'invoicing', 'reports', 'csv_import', 'csv_export', 'multi_currency', 'bank_reconciliation', 'payroll'],
    enterprise: ['all']
  }
  return features[type] || features.trial
}

/**
 * Check current license status
 */
export async function checkLicenseStatus(): Promise<LicenseValidation> {
  // Check for stored license
  const storedLicense = loadLicense()

  if (storedLicense && storedLicense.isValid) {
    // Verify machine ID still matches
    const currentMachineId = await getMachineFingerprint()
    if (storedLicense.machineId === currentMachineId) {
      return {
        valid: true,
        license: storedLicense,
        daysRemaining: storedLicense.type === 'trial' ? getTrialDaysRemaining() : undefined
      }
    }
  }

  // Check trial status
  const trialDays = getTrialDaysRemaining()
  if (trialDays > 0) {
    return {
      valid: true,
      license: {
        key: 'TRIAL',
        type: 'trial',
        isValid: true,
        expiresAt: null,
        activatedAt: getTrialStartDate()?.toISOString() || new Date().toISOString(),
        machineId: await getMachineFingerprint(),
        maxUsers: 1,
        features: getFeaturesByType('trial')
      },
      daysRemaining: trialDays
    }
  }

  // No valid license
  return {
    valid: false,
    license: null,
    error: 'No valid license found. Please enter a license key or start a trial.'
  }
}
