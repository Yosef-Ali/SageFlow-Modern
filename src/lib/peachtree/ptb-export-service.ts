/**
 * PTB Export Service for SageFlow (Browser-compatible)
 * 
 * Generates Peachtree-compatible backup (.ptb) files using JSZip.
 * Works in Vite/React — no Node.js Buffer needed.
 */

import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

export interface PtbExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  counts?: {
    customers: number;
    vendors: number;
    accounts: number;
    items: number;
  };
}

/**
 * Generate a Peachtree-compatible .ptb backup from SageFlow data.
 * Returns a downloadable Blob.
 */
export async function generatePtbBackup(companyId: string): Promise<PtbExportResult> {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    // Fetch all data from Supabase
    const [customers, vendors, accounts, items] = await Promise.all([
      supabase.from('customers').select('*').eq('company_id', companyId).then(r => r.data || []),
      supabase.from('vendors').select('*').eq('company_id', companyId).then(r => r.data || []),
      supabase.from('chart_of_accounts').select('*').eq('company_id', companyId).then(r => r.data || []),
      supabase.from('items').select('*').eq('company_id', companyId).then(r => r.data || []),
    ]);

    // Build ZIP
    const zip = new JSZip();

    if (customers.length > 0) {
      zip.file('CUSTOMER.DAT', generateCustomerDAT(customers));
    }
    if (vendors.length > 0) {
      zip.file('VENDOR.DAT', generateVendorDAT(vendors));
    }
    if (accounts.length > 0) {
      zip.file('CHART.DAT', generateChartDAT(accounts));
    }
    if (items.length > 0) {
      zip.file('LINEITEM.DAT', generateItemsDAT(items));
    }

    // Combined address file
    zip.file('ADDRESS.DAT', generateAddressDAT(customers, vendors));

    // Metadata
    zip.file('COMPANY.INI', generateMetadata());

    // Generate blob
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const date = new Date().toISOString().split('T')[0];

    return {
      success: true,
      blob,
      filename: `SageFlow_Backup_${date}.ptb`,
      counts: {
        customers: customers.length,
        vendors: vendors.length,
        accounts: accounts.length,
        items: items.length,
      },
    };
  } catch (error: any) {
    console.error('[PTB Export] Failed:', error);
    return { success: false, error: error.message || 'Failed to generate backup' };
  }
}

// ─── DAT File Generators ────────────────────────────────────────────────────

function pad(str: string, len: number): string {
  return (str || '').padEnd(len, ' ').substring(0, len);
}

function generateCustomerDAT(customers: any[]): string {
  return customers.map((c, i) => [
    pad(c.customer_number || `CUST${i}`, 20),
    pad(c.name || '', 50),
    pad(c.contact_name || '', 30),
    pad(c.email || '', 50),
    pad(c.phone || '', 20),
    pad(String(c.balance || '0'), 15),
    pad(String(c.credit_limit || '0'), 15),
    pad(c.payment_terms || 'NET_30', 10),
  ].join('') + '\r\n').join('');
}

function generateVendorDAT(vendors: any[]): string {
  return vendors.map((v, i) => [
    pad(v.vendor_number || `VEND${i}`, 20),
    pad(v.name || '', 50),
    pad(v.contact_name || '', 30),
    pad(v.email || '', 50),
    pad(v.phone || '', 20),
    pad(String(v.balance || '0'), 15),
    pad(v.payment_terms || 'NET_30', 10),
  ].join('') + '\r\n').join('');
}

function generateChartDAT(accounts: any[]): string {
  return accounts.map(a => [
    pad(a.account_number || '', 10),
    pad(a.account_name || '', 60),
    pad(a.type || 'ASSET', 10),
    pad(String(a.balance || '0'), 15),
    pad(a.is_active ? 'Y' : 'N', 1),
  ].join('') + '\r\n').join('');
}

function generateItemsDAT(items: any[]): string {
  return items.map(item => [
    pad(item.item_number || item.sku || '', 20),
    pad(item.name || '', 60),
    pad(item.description || '', 100),
    pad(String(item.cost_price || '0'), 15),
    pad(String(item.sales_price || item.selling_price || '0'), 15),
    pad(String(item.quantity_on_hand || '0'), 10),
    pad(item.unit_of_measure || 'EACH', 10),
  ].join('') + '\r\n').join('');
}

function generateAddressDAT(customers: any[], vendors: any[]): string {
  const lines: string[] = [];

  customers.forEach(c => {
    const addr = c.billing_address || {};
    lines.push([
      pad('CUSTOMER', 10),
      pad(c.customer_number || '', 20),
      pad(addr.street || '', 60),
      pad(addr.city || '', 30),
      pad(addr.region || '', 30),
      pad(addr.postal_code || '', 10),
      pad(addr.country || 'Ethiopia', 30),
    ].join('') + '\r\n');
  });

  vendors.forEach(v => {
    const addr = v.address || {};
    lines.push([
      pad('VENDOR', 10),
      pad(v.vendor_number || '', 20),
      pad(addr.street || '', 60),
      pad(addr.city || '', 30),
      pad(addr.state || '', 30),
      pad(addr.zip || '', 10),
      pad(addr.country || 'Ethiopia', 30),
    ].join('') + '\r\n');
  });

  return lines.join('');
}

function generateMetadata(): string {
  return `[Company]
Name=SageFlow Export
Version=PAW20.012
ExportDate=${new Date().toISOString()}
Format=Peachtree Compatible
Generator=SageFlow Modern
`;
}

/**
 * Download a PTB export result as a file.
 */
export function downloadPtbBackup(result: PtbExportResult): void {
  if (!result.success || !result.blob || !result.filename) return;

  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
