// Re-export from new service layer for backward compatibility
export {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  cancelInvoice,
  getCustomersForDropdown,
  getItemsForDropdown,
  getInvoicesSummary,
  recordInvoicePayment,
  type InvoiceWithCustomer,
  type InvoiceItemData,
} from '@/services/invoice-service'
