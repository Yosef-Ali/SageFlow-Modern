import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Lazy load pages for better performance
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const CustomersPage = lazy(() => import('@/pages/dashboard/Customers'))
const InvoicesPage = lazy(() => import('@/pages/dashboard/Invoices'))
const VendorsPage = lazy(() => import('@/pages/dashboard/Vendors'))
const SettingsPage = lazy(() => import('@/pages/dashboard/Settings'))
const BankingPage = lazy(() => import('@/pages/dashboard/Banking'))
const InventoryPage = lazy(() => import('@/pages/dashboard/Inventory'))
const PaymentsPage = lazy(() => import('@/pages/dashboard/Payments'))
const ReportsPage = lazy(() => import('@/pages/dashboard/Reports'))
const EmployeesPage = lazy(() => import('@/pages/dashboard/Employees'))
const ChartOfAccountsPage = lazy(() => import('@/pages/dashboard/ChartOfAccounts'))
const JournalsPage = lazy(() => import('@/pages/dashboard/Journals'))
const PurchasesPage = lazy(() => import('@/pages/dashboard/Purchases'))
const PurchaseOrdersPage = lazy(() => import('@/pages/dashboard/purchases/PurchaseOrders'))
const NewPurchaseOrderPage = lazy(() => import('@/pages/dashboard/purchases/NewPurchaseOrder'))
const BillsPage = lazy(() => import('@/pages/dashboard/purchases/Bills'))
const NewBillPage = lazy(() => import('@/pages/dashboard/purchases/NewBill'))
const NewVendorPage = lazy(() => import('@/pages/dashboard/vendors/NewVendor'))
const NewInvoicePage = lazy(() => import('@/pages/dashboard/invoices/NewInvoice'))
const EditInvoicePage = lazy(() => import('@/pages/dashboard/invoices/EditInvoice'))
const InvoiceDetailPage = lazy(() => import('@/pages/dashboard/invoices/InvoiceDetail'))
const NewItemPage = lazy(() => import('@/pages/dashboard/inventory/NewItem'))
const NewPaymentPage = lazy(() => import('@/pages/dashboard/payments/NewPayment'))
const PaymentDetailPage = lazy(() => import('@/pages/dashboard/payments/PaymentDetail'))
const EditPaymentPage = lazy(() => import('@/pages/dashboard/payments/EditPayment'))
const NewCustomerPage = lazy(() => import('@/pages/dashboard/customers/NewCustomer'))
const CustomerDetailPage = lazy(() => import('@/pages/dashboard/customers/CustomerDetail'))
const EditCustomerPage = lazy(() => import('@/pages/dashboard/customers/EditCustomer'))
const VendorDetailPage = lazy(() => import('@/pages/dashboard/vendors/VendorDetail'))
const EditVendorPage = lazy(() => import('@/pages/dashboard/vendors/EditVendor'))
const ItemDetailPage = lazy(() => import('@/pages/dashboard/inventory/ItemDetail'))
const EditItemPage = lazy(() => import('@/pages/dashboard/inventory/EditItem'))
const AssembliesPage = lazy(() => import('@/pages/dashboard/inventory/Assemblies'))
const NewAssemblyPage = lazy(() => import('@/pages/dashboard/inventory/NewAssembly'))
const NewEmployeePage = lazy(() => import('@/pages/dashboard/employees/NewEmployee'))
const InventoryAdjustmentsPage = lazy(() => import('@/pages/dashboard/inventory/InventoryAdjustments'))

const NewJournalEntryPage = lazy(() => import('@/pages/dashboard/journals/NewJournalEntry'))
const ProfitLossPage = lazy(() => import('@/pages/dashboard/reports/ProfitLoss'))
const TrialBalancePage = lazy(() => import('@/pages/dashboard/reports/TrialBalance'))
const GeneralLedgerPage = lazy(() => import('@/pages/dashboard/reports/GeneralLedger'))
const BalanceSheetPage = lazy(() => import('@/pages/dashboard/reports/BalanceSheet'))
const NewAccountPage = lazy(() => import('@/pages/dashboard/accounts/NewAccount'))

const ProfileSettingsPage = lazy(() => import('@/pages/dashboard/settings/Profile'))
const ImportExportPage = lazy(() => import('@/pages/dashboard/settings/ImportExport'))
const AuditTrailPage = lazy(() => import('@/pages/dashboard/AuditTrail'))
const ApiKeysPage = lazy(() => import('@/pages/dashboard/settings/ApiKeys'))

// Banking Phase 3
const NewBankAccountPage = lazy(() => import('@/pages/dashboard/banking/NewBankAccount'))
const BankAccountDetailPage = lazy(() => import('@/pages/dashboard/banking/BankAccountDetail'))
const EditBankAccountPage = lazy(() => import('@/pages/dashboard/banking/EditBankAccount'))
const ReconcileAccountPage = lazy(() => import('@/pages/dashboard/banking/ReconcileAccount'))

// Purchases Phase 3
const PurchaseOrderDetailPage = lazy(() => import('@/pages/dashboard/purchases/PurchaseOrderDetail'))
const BillDetailPage = lazy(() => import('@/pages/dashboard/purchases/BillDetail'))
const EditBillPage = lazy(() => import('@/pages/dashboard/purchases/EditBill'))

// Phase 4
const EditEmployeePage = lazy(() => import('@/pages/dashboard/employees/EditEmployee'))
const EditAccountPage = lazy(() => import('@/pages/dashboard/accounts/EditAccount'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
)

// Placeholder for pages not yet migrated
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <h2 className="text-2xl font-bold text-slate-700 mb-2">{title}</h2>
    <p className="text-slate-500">This page is under development</p>
  </div>
)

export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<PlaceholderPage title="Register" />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Customers */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<NewCustomerPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="customers/:id/edit" element={<EditCustomerPage />} />

            {/* Invoices */}
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<NewInvoicePage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="invoices/:id/edit" element={<EditInvoicePage />} />

            {/* Vendors */}
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="vendors/new" element={<NewVendorPage />} />
            <Route path="vendors/:id" element={<VendorDetailPage />} />
            <Route path="vendors/:id/edit" element={<EditVendorPage />} />

            {/* Payments */}
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="payments/new" element={<NewPaymentPage />} />
            <Route path="payments/:id" element={<PaymentDetailPage />} />
            <Route path="payments/:id/edit" element={<EditPaymentPage />} />

            {/* Inventory */}
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/new" element={<NewItemPage />} />
            <Route path="inventory/adjustments" element={<InventoryAdjustmentsPage />} />
            <Route path="inventory/:id" element={<ItemDetailPage />} />
            <Route path="inventory/:id/edit" element={<EditItemPage />} />
            <Route path="inventory/assemblies" element={<AssembliesPage />} />
            <Route path="inventory/assemblies/new" element={<NewAssemblyPage />} />

            {/* Banking */}
            <Route path="banking" element={<BankingPage />} />
            <Route path="banking/new" element={<NewBankAccountPage />} />
            <Route path="banking/:id" element={<BankAccountDetailPage />} />
            <Route path="banking/:id/edit" element={<EditBankAccountPage />} />
            <Route path="banking/:id/reconcile" element={<ReconcileAccountPage />} />

            {/* Purchases */}
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/orders" element={<PurchaseOrdersPage />} />
            <Route path="purchases/orders/new" element={<NewPurchaseOrderPage />} />
            <Route path="purchases/orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="purchases/bills" element={<BillsPage />} />
            <Route path="purchases/bills/new" element={<NewBillPage />} />
            <Route path="purchases/bills/:id" element={<BillDetailPage />} />
            <Route path="purchases/bills/:id/edit" element={<EditBillPage />} />

            {/* Employees */}
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="employees/new" element={<NewEmployeePage />} />
            <Route path="employees/:id/edit" element={<EditEmployeePage />} />

            {/* Chart of Accounts */}
            <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
            <Route path="chart-of-accounts/new" element={<NewAccountPage />} />
            <Route path="chart-of-accounts/:id/edit" element={<EditAccountPage />} />

            {/* Journals */}
            <Route path="journals" element={<JournalsPage />} />
            <Route path="journals/new" element={<NewJournalEntryPage />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/profit-loss" element={<ProfitLossPage />} />
            <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
            <Route path="reports/trial-balance" element={<TrialBalancePage />} />
            <Route path="reports/general-ledger" element={<GeneralLedgerPage />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/profile" element={<ProfileSettingsPage />} />
            <Route path="settings/company" element={<PlaceholderPage title="Company Settings" />} />
            <Route path="settings/api-keys" element={<ApiKeysPage />} />
            <Route path="settings/import-export" element={<ImportExportPage />} />
            <Route path="settings/billing" element={<PlaceholderPage title="Billing" />} />
            <Route path="settings/peachtree-sync" element={<PlaceholderPage title="Peachtree Sync" />} />
            <Route path="settings/sync-history" element={<PlaceholderPage title="Sync History" />} />

            {/* Audit Trail */}
            {/* Audit Trail */}
            <Route path="audit-trail" element={<AuditTrailPage />} />

            {/* Catch-all for unmatched dashboard routes */}
            <Route path="*" element={<PlaceholderPage title="Page Not Found" />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
