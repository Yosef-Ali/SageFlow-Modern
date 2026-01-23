# SageFlow Modern

Modern accounting software for Ethiopian businesses - Desktop application with Electron.

## Installation

### Windows

1. Download the latest `SageFlow-Windows-Setup.exe` from [Releases](https://github.com/Yosef-Ali/SageFlow-Modern/releases)
2. Double-click to install
3. Launch SageFlow from the Start Menu

**No additional software required** - everything is bundled in the installer.

### macOS

1. Download the latest `.dmg` from [Releases](https://github.com/Yosef-Ali/SageFlow-Modern/releases)
2. Open the DMG and drag SageFlow to Applications
3. Launch from Applications folder

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your DATABASE_URL

# Run development server
pnpm dev

# Run Electron in development
pnpm electron:dev
```

### Build Desktop App

```bash
# Build for Windows
pnpm electron:build

# Build for macOS
pnpm electron:build:mac
```

### Database

```bash
# Push schema changes
pnpm db:push

# Open database studio
pnpm db:studio

# Seed demo data
pnpm db:seed
```

## Features

- Multi-tenant accounting
- Customer & vendor management
- Invoicing with PDF generation
- Inventory tracking
- Financial reports (P&L, Balance Sheet, Trial Balance)
- Ethiopian Birr (ETB) currency
- Peachtree/Sage 50 data migration (optional ODBC)

## Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

## Peachtree Migration (Optional)

To enable direct Peachtree ODBC sync:

```bash
# Install ODBC driver (Windows only)
pnpm add odbc
```

This feature is optional - CSV import is always available.

## License

Proprietary - SageFlow
