# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SageFlow Modern is a Next.js 14-based accounting application optimized for Ethiopian businesses. It features multi-tenancy, comprehensive financial management (invoicing, payments, inventory), and integrates Ethiopian-specific features (ETB currency, Chapa payment gateway, Ethiopian VAT).

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database (Prisma)
npx prisma generate      # Generate Prisma Client after schema changes
npx prisma db push       # Push schema changes to database (development)
npx prisma migrate dev   # Create and apply migration (production-ready)
npx prisma studio        # Open visual database editor

# Testing (when implemented)
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
```

### Database Workflow
When modifying `prisma/schema.prisma`:
```bash
npx prisma migrate dev --name descriptive_change_name  # Creates migration
npx prisma generate                                     # Updates Prisma Client
```

## Architecture

### Technology Stack
- **Framework**: Next.js 14 (App Router with React Server Components)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom theme
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (to be implemented)
- **State**: Zustand for client state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer
- **Email**: Resend

### Project Structure
```
src/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Auth routes (login, register) - route group
│   ├── (dashboard)/         # Protected dashboard routes - route group
│   │   ├── layout.tsx       # Sidebar navigation layout
│   │   └── page.tsx         # Dashboard home
│   ├── api/                 # API routes (Next.js API routes)
│   ├── layout.tsx           # Root layout (global HTML structure)
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles + Tailwind imports
├── components/              # React components
│   ├── ui/                  # Reusable UI components (shadcn/ui)
│   ├── dashboard/           # Dashboard-specific components
│   ├── customers/           # Customer management components
│   ├── invoices/            # Invoice components
│   └── layouts/             # Layout components
├── lib/                     # Utilities and configuration
│   ├── utils.ts             # Common utilities (cn, formatCurrency, formatDate)
│   └── prisma.ts            # Prisma client singleton (to be created)
├── types/                   # TypeScript type definitions
└── stores/                  # Zustand state stores

prisma/
└── schema.prisma            # Database schema (9 models)
```

### Key Architecture Patterns

**Multi-Tenancy Model**
- Every data model is scoped to a `companyId`
- Users belong to one company via `User.companyId`
- All queries must filter by `companyId` to enforce tenant isolation
- Example: `prisma.customer.findMany({ where: { companyId } })`

**Route Groups**
- `(auth)` - Public authentication pages (login, register)
- `(dashboard)` - Protected dashboard with sidebar layout
- Route groups don't affect URL structure but allow different layouts

**Database Models (9 core models)**
1. **User & Session** - Authentication (NextAuth)
2. **Company** - Multi-tenancy root
3. **Customer** - Customer management with balance tracking
4. **Invoice & InvoiceItem** - Invoicing with line items
5. **Payment** - Payment tracking linked to invoices
6. **Item & ItemCategory** - Inventory with hierarchical categories
7. **Vendor** - Supplier management
8. **ChartOfAccount** - Hierarchical chart of accounts
9. **StockMovement** - Inventory tracking (purchases, sales, adjustments)

**Ethiopian Market Specifics**
- Default currency: ETB (Ethiopian Birr)
- ETB formatting: Custom formatter in `utils.ts` (displays as "ETB X.XX")
- VAT: 15% Ethiopian standard (built into invoice calculations)
- Payment gateway: Chapa integration (env: `CHAPA_SECRET_KEY`)
- Internationalization: Amharic support planned

## Path Alias

Use the `@/` alias for imports from `src/`:
```typescript
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:
```bash
# Required
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET          # Random secret for NextAuth
NEXTAUTH_URL             # http://localhost:3000

# Payment Gateways
CHAPA_SECRET_KEY         # Ethiopian payment gateway (primary)
STRIPE_SECRET_KEY        # International payments (optional)

# Services
RESEND_API_KEY           # Email sending
GEMINI_API_KEY           # AI features (inherited from prototype)

# Storage (optional)
AWS_ACCESS_KEY_ID        # Document storage
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_BUCKET_NAME
```

## Database Schema Highlights

### Critical Relationships
- `Company` is the multi-tenancy root (all entities link to it)
- `Invoice.customerId` → `Customer.id` (invoices tied to customers)
- `Payment.invoiceId` → `Invoice.id` (payments tied to invoices)
- `InvoiceItem.itemId` → `Item.id` (invoice lines can reference inventory)
- `Item.categoryId` → `ItemCategory.id` (hierarchical categorization)

### Important Fields
- **Status tracking**: `Invoice.status` (DRAFT → SENT → PAID/OVERDUE/CANCELLED)
- **Balance tracking**: `Customer.balance`, `Vendor.balance`
- **Soft deletes**: Use `isActive` boolean (Customer, Item, User, etc.)
- **Unique constraints**: `customerNumber`, `invoiceNumber`, `sku` are company-scoped unique

### Enums
- `UserRole`: ADMIN, ACCOUNTANT, MANAGER, EMPLOYEE, VIEWER
- `AccountType`: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- `InvoiceStatus`: DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
- `ItemType`: PRODUCT, SERVICE, BUNDLE
- `MovementType`: PURCHASE, SALE, ADJUSTMENT, TRANSFER, RETURN

## Component Patterns

### shadcn/ui Components
Install components as needed:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
```

Components are installed to `src/components/ui/` and can be customized.

### Utility Functions
```typescript
// Tailwind class merging (for component variants)
cn('base-class', condition && 'conditional-class')

// Currency formatting (Ethiopian Birr)
formatCurrency(1500)  // "ETB 1,500.00"

// Date formatting
formatDate(new Date())  // "Jan 17, 2026"
```

## Implementation Status

### Completed
- Next.js 14 project structure with App Router
- Complete Prisma schema (9 models)
- Landing page with feature overview
- Dashboard layout with sidebar navigation
- Dashboard home with placeholder stats
- TypeScript configuration
- Tailwind CSS setup with custom theme
- Path aliases configured
- **Authentication** - NextAuth.js with Credentials provider, login/register pages, session management, middleware protection
- **Customer Management** - Full CRUD with server actions, React Query hooks, form validation

### To Implement (Priority Order)
1. **Invoice Creation** - Multi-line invoice form, PDF generation
2. **Payment Recording** - Payment forms, receipt generation
3. **Dashboard Charts** - Real-time financial metrics with Recharts
4. **Reports** - P&L, balance sheet, aged receivables
5. **Multi-language** - Amharic translations


## Code Quality Standards

- Use TypeScript strict mode (already enabled)
- Follow Next.js 14 App Router conventions
- Server Components by default, Client Components (`'use client'`) only when needed
- Use Server Actions for mutations when possible
- Always filter by `companyId` in database queries (multi-tenancy)
- Use Prisma transactions for multi-step operations
- Validate inputs with Zod schemas
- Use `cn()` utility for conditional Tailwind classes
- Format currency with `formatCurrency()` helper

## Migration from Prototype

This project was scaffolded from a Vite/React prototype. Legacy files at root level:
- `App.tsx`, `components/`, `services/`, `types.ts`, `index.tsx`, `vite.config.ts`

These are **not used** in the Next.js app. All active code is in `src/`. Legacy files can be removed once features are migrated.

## Ethiopian Business Context

SageFlow Modern is optimized for Ethiopian SMEs with:
- ETB as primary currency
- Chapa payment gateway integration
- 15% VAT calculations
- Amharic language support (planned)
- Local business workflows (cash-heavy, invoice-based)

When implementing features, consider Ethiopian business practices and regulatory requirements.
