// Re-export from new service layer for backward compatibility
export {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  restoreVendor,
  getVendorsSummary,
  getVendorsForDropdown,
  type VendorFormValues,
} from '@/services/vendor-service'
