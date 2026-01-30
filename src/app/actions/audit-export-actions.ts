/**
 * Audit Export Actions - Ethiopian Customs & ERCA Compliant
 * ለኢትዮጵያ ጉምሩክና ገቢዎች ባለስልጣን ኦዲት ተኳሃኝ
 */

import { supabase } from "@/lib/supabase"

// Helper to format date for Ethiopian reports
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Helper to format currency for Ethiopian Birr
function formatBirr(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Export Journal Entries / General Ledger for Audit
 * የጠቅላላ ደብተር ወጪ
 */
export async function exportJournalEntriesCSV(companyId: string, dateFrom?: string, dateTo?: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    // CSV Header (English + Amharic)
    const headers = [
      'Date (ቀን)',
      'Entry Number (የመዝገብ ቁጥር)',
      'Account Number (የሂሳብ ቁጥር)',
      'Account Name (የሂሳብ ስም)',
      'Description (መግለጫ)',
      'Reference (ማጣቀሻ)',
      'Debit (ዴቢት)',
      'Credit (ክሬዲት)',
      'Balance (ቀሪ ሂሳብ)',
    ].join(',');

    const rows = (data || []).map(entry => [
      formatDate(entry.date),
      entry.entry_number || entry.id,
      entry.account_number || '',
      `"${(entry.account_name || '').replace(/"/g, '""')}"`,
      `"${(entry.description || '').replace(/"/g, '""')}"`,
      entry.reference || '',
      formatBirr(Number(entry.debit) || 0),
      formatBirr(Number(entry.credit) || 0),
      formatBirr(Number(entry.balance) || 0),
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Invoices with VAT for ERCA
 * የደረሰኝ ወጪ ከተ.እ.ታ ጋር
 */
export async function exportInvoicesCSV(companyId: string, dateFrom?: string, dateTo?: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers:customer_id (name, tin_number, email, phone)
      `)
      .eq('company_id', companyId)
      .order('date', { ascending: true });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    // CSV Header for ERCA compliance
    const headers = [
      'Invoice No (የደረሰኝ ቁጥር)',
      'Invoice Date (ቀን)',
      'Due Date (የመክፈያ ቀን)',
      'Customer Name (የደንበኛ ስም)',
      'Customer TIN (የደንበኛ ቲን)',
      'Subtotal (ንዑስ ድምር)',
      'VAT 15% (ተ.እ.ታ 15%)',
      'Withholding Tax 2% (ግብር 2%)',
      'Total Amount (ጠቅላላ ድምር)',
      'Status (ሁኔታ)',
      'Payment Status (የክፍያ ሁኔታ)',
    ].join(',');

    const rows = (data || []).map(inv => {
      const subtotal = Number(inv.subtotal) || 0;
      const vat = Number(inv.vat_amount) || (subtotal * 0.15);
      const withholding = Number(inv.withholding_tax) || 0;
      const total = Number(inv.total_amount) || (subtotal + vat - withholding);
      
      return [
        inv.invoice_number || inv.id,
        formatDate(inv.invoice_date),
        formatDate(inv.due_date),
        `"${((inv.customers as any)?.name || inv.customer_name || '').replace(/"/g, '""')}"`,
        (inv.customers as any)?.tin_number || inv.customer_tin || '',
        formatBirr(subtotal),
        formatBirr(vat),
        formatBirr(withholding),
        formatBirr(total),
        inv.status || 'DRAFT',
        inv.payment_status || 'UNPAID',
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Trial Balance Report
 * የሙከራ ሚዛን ሪፖርት
 */
export async function exportTrialBalanceCSV(companyId: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('account_number', { ascending: true });

    if (error) throw error;

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = (data || []).map(acc => {
      const balance = Number(acc.balance) || 0;
      let debit = 0;
      let credit = 0;

      // Debit normal: Assets, Expenses
      // Credit normal: Liabilities, Equity, Revenue
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        if (balance >= 0) debit = balance;
        else credit = Math.abs(balance);
      } else {
        if (balance >= 0) credit = balance;
        else debit = Math.abs(balance);
      }

      totalDebit += debit;
      totalCredit += credit;

      return [
        acc.account_number,
        `"${(acc.account_name || '').replace(/"/g, '""')}"`,
        acc.type,
        formatBirr(debit),
        formatBirr(credit),
      ].join(',');
    });

    // Add totals row
    rows.push(['', 'TOTAL (ጠቅላላ)', '', formatBirr(totalDebit), formatBirr(totalCredit)].join(','));

    const headers = [
      'Account No (የሂሳብ ቁጥር)',
      'Account Name (የሂሳብ ስም)',
      'Type (ዓይነት)',
      'Debit (ዴቢት)',
      'Credit (ክሬዲት)',
    ].join(',');

    const csv = [headers, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Bank Transactions for Audit
 * የባንክ ግብይቶች ወጪ
 */
export async function exportBankTransactionsCSV(companyId: string, dateFrom?: string, dateTo?: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    // First get bank accounts for this company
    const { data: bankAccounts } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('company_id', companyId);

    const bankAccountIds = bankAccounts?.map(b => b.id) || [];

    if (bankAccountIds.length === 0) {
      return { success: true, data: 'No bank accounts found' };
    }

    let query = supabase
      .from('bank_transactions')
      .select(`
        *,
        bank_accounts:bank_account_id (account_name, account_number, bank_name)
      `)
      .in('bank_account_id', bankAccountIds)
      .order('date', { ascending: true });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const headers = [
      'Date (ቀን)',
      'Bank Account (የባንክ ሂሳብ)',
      'Bank Name (የባንክ ስም)',
      'Type (ዓይነት)',
      'Reference (ማጣቀሻ)',
      'Description (መግለጫ)',
      'Deposit (ገቢ)',
      'Withdrawal (ወጪ)',
      'Balance (ቀሪ ሂሳብ)',
      'Reconciled (የተስተካከለ)',
    ].join(',');

    const rows = (data || []).map(txn => {
      const isDeposit = txn.type === 'DEPOSIT' || txn.type === 'CREDIT';
      const amount = Number(txn.amount) || 0;
      
      return [
        formatDate(txn.transaction_date),
        `"${((txn.bank_accounts as any)?.account_number || '').replace(/"/g, '""')}"`,
        `"${((txn.bank_accounts as any)?.bank_name || '').replace(/"/g, '""')}"`,
        txn.type || '',
        txn.reference || '',
        `"${(txn.description || '').replace(/"/g, '""')}"`,
        isDeposit ? formatBirr(amount) : '0.00',
        !isDeposit ? formatBirr(amount) : '0.00',
        formatBirr(Number(txn.running_balance) || 0),
        txn.is_reconciled ? 'Yes' : 'No',
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Customer List with TIN for Tax Audit
 * የደንበኞች ዝርዝር ከቲን ጋር
 */
export async function exportCustomersWithTinCSV(companyId: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const headers = [
      'Customer Number (የደንበኛ ቁጥር)',
      'Name (ስም)',
      'TIN Number (የቲን ቁጥር)',
      'Email (ኢሜይል)',
      'Phone (ስልክ)',
      'Address (አድራሻ)',
      'Customer Type (የደንበኛ ዓይነት)',
      'Payment Terms (የክፍያ ሁኔታ)',
      'Credit Limit (የብድር ገደብ)',
    ].join(',');

    const rows = (data || []).map(c => [
      c.customer_number || '',
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.tin_number || '',
      c.email || '',
      c.phone || '',
      `"${(c.address || c.billing_address?.street || '').replace(/"/g, '""')}"`,
      c.customer_type || 'CORPORATE',
      c.payment_terms || 'NET_30',
      formatBirr(Number(c.credit_limit) || 0),
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Vendor List with TIN for Tax Audit
 * የአቅራቢዎች ዝርዝር ከቲን ጋር
 */
export async function exportVendorsWithTinCSV(companyId: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const headers = [
      'Vendor Number (የአቅራቢ ቁጥር)',
      'Name (ስም)',
      'TIN Number (የቲን ቁጥር)',
      'Email (ኢሜይል)',
      'Phone (ስልክ)',
      'Address (አድራሻ)',
      'Vendor Type (የአቅራቢ ዓይነት)',
      'Payment Terms (የክፍያ ሁኔታ)',
    ].join(',');

    const rows = (data || []).map(v => [
      v.vendor_number || '',
      `"${(v.name || '').replace(/"/g, '""')}"`,
      v.tin_number || '',
      v.email || '',
      v.phone || '',
      `"${(v.address || '').replace(/"/g, '""')}"`,
      v.vendor_type || 'SUPPLIER',
      v.payment_terms || 'NET_30',
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate Full Audit Package (ZIP with all reports)
 * ሙሉ የኦዲት ፓኬጅ
 */
export async function generateFullAuditPackage(companyId: string, dateFrom?: string, dateTo?: string) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    // Get all reports
    const [
      journalResult,
      invoicesResult,
      trialBalanceResult,
      bankResult,
      customersResult,
      vendorsResult,
    ] = await Promise.all([
      exportJournalEntriesCSV(companyId, dateFrom, dateTo),
      exportInvoicesCSV(companyId, dateFrom, dateTo),
      exportTrialBalanceCSV(companyId),
      exportBankTransactionsCSV(companyId, dateFrom, dateTo),
      exportCustomersWithTinCSV(companyId),
      exportVendorsWithTinCSV(companyId),
    ]);

    return {
      success: true,
      data: {
        journalEntries: journalResult.data,
        invoices: invoicesResult.data,
        trialBalance: trialBalanceResult.data,
        bankTransactions: bankResult.data,
        customers: customersResult.data,
        vendors: vendorsResult.data,
        generatedAt: new Date().toISOString(),
        period: { from: dateFrom, to: dateTo },
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
