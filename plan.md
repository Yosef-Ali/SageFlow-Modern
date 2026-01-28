# Peachtree Business Logic Review & Fix Plan

## Phase 1: Dashboard - Replace Mock Data with Real Queries

### 1A. Fix `dashboard-actions.ts` - Complete all query functions
- **Total Revenue**: Sum of invoices.total WHERE status = 'PAID'
- **Accounts Receivable (AR)**: Sum of (total - paid_amount) for SENT + PARTIALLY_PAID + OVERDUE invoices
- **Active Customers**: Count of active customers
- **Invoices This Month**: Count of invoices created this month
- **Monthly Revenue**: Last 6 months grouped by month
- **Recent Invoices**: Last 5 invoices with customer names
- **Overdue Payments**: Invoices past due_date with days overdue

### 1B. Wire Dashboard.tsx to use real hooks
- Remove MOCK_STATS and MOCK_REVENUE constants
- Use existing `use-dashboard.ts` hooks with real data

## Phase 2: Automatic Journal Entries (Double-Entry Bookkeeping)

### 2A. Create `journal-service.ts`
- `createJournalEntry()` function that:
  - Inserts into journal_entries + journal_lines
  - Updates chart_of_accounts.balance
  - Wrapped in try/catch (never blocks parent transaction)

### 2B. Add journal calls to invoice-service.ts
- Invoice created (non-DRAFT) → Debit AR (1100), Credit Revenue (4000)
- Payment received → Debit Cash (1000), Credit AR (1100)

### 2C. Add journal calls to purchase-actions.ts
- Bill created → Debit Expense (6000), Credit AP (2000)
- Bill paid → Debit AP (2000), Credit Cash (1000)

## Phase 3: Fix Financial Reports

### 3A. Fix trial balance debit/credit classification
- ASSET/EXPENSE = natural debit (positive balance → debit column)
- LIABILITY/EQUITY/REVENUE = natural credit (positive balance → credit column)

### 3B. Fix GL summary stub with real journal_lines aggregation

## Files to modify:
- `src/app/actions/dashboard-actions.ts`
- `src/pages/Dashboard.tsx`
- `src/services/journal-service.ts` (new)
- `src/services/invoice-service.ts`
- `src/app/actions/purchase-actions.ts`
- `src/app/actions/report-actions.ts`
