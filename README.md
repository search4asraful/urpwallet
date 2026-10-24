# urpwallet — Your Personal Wallet

<p align="center">
  <img src="public/icon.svg" alt="urpwallet Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>urpwallet</strong> (short form of <em>Your Personal Wallet</em>) is a modern, open-source, privacy-first personal finance tracker, multi-account manager, and daily budget planner.
</p>

<p align="center">
  <a href="#-prerequisites">Prerequisites</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-features">Features</a> •
  <a href="#-data-storage--persistence">Database</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-docker--self-hosting">Docker</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

---

## 🌟 Key Highlights

- **🔒 100% Privacy & Local-First**: Your financial data never leaves your machine. Powered by an embedded SQLite database running locally.
- **⚡ Zero Cloud Dependencies**: No third-party accounts, no subscriptions, and no database servers to provision. Clone, install, and run.
- **💼 Multi-Account & Multi-Currency**: Manage checking accounts, cash wallets, credit cards, savings goals, loans, and investments with independent currencies.
- **🔄 Complete Portability**: Bi-directional data import & export supporting full JSON backups and CSV bank statements with safe merge or full restore modes.
- **☁️ Google Drive Cloud Backup & Sync**: Connect your personal Google Drive for automated scheduled backups (hourly, 6h, daily, weekly), cloud restore, and retention pruning.
- **🎨 8 Aesthetic Themes**: Native system theme detection, light, dark, OLED pitch black, Tokyo Night, Forest, Sunset, and Nord.
- **👁️ Privacy Shield**: One-click balance masking (`••••••`) for safe usage in public spaces or coffee shops.
- **📱 PWA Ready**: Installable on iOS, Android, macOS, and Windows with a native web app experience.

---

## 📋 Prerequisites

Before running **urpwallet**, ensure you have the following installed on your system:

### 1. Node.js & Package Manager
- **Node.js**: `v18.17.0` or higher (`v20.x LTS` or `v24.x` recommended).
  - Verify installation:
    ```bash
    node -v
    ```
- **npm** (v9.0.0+), **pnpm** (v8.0.0+), **yarn** (v1.22+), or **bun** (v1.0+).
  - Verify installation:
    ```bash
    npm -v
    ```

### 2. Operating System
- **Linux** (Ubuntu, Debian, Fedora, Arch, etc.)
- **macOS** (Apple Silicon or Intel, Ventura/Sonoma/Sequoia)
- **Windows 10/11** (Native PowerShell or Windows Subsystem for Linux - WSL2)

### 3. Native Build Tools (Optional / Platform-Specific)
urpwallet uses [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) for high-performance SQLite operations. Prebuilt binary wheels are automatically downloaded during `npm install` for almost all major operating systems and CPU architectures (x64 and arm64).

*Note: If you are building on a non-standard architecture or a minimal Docker image (such as Alpine Linux), ensure you have standard C/C++ compilation tools installed:*
- **Debian / Ubuntu**: `sudo apt install -y build-essential python3`
- **Alpine Linux**: `apk add --no-cache python3 make g++`
- **macOS**: `xcode-select --install`
- **Windows**: `npm install --global --production windows-build-tools` (or Visual Studio Build Tools with C++ workload)

---

## 🚀 Quickstart

Get your personal wallet up and running in under a minute:

### 1. Clone the Repository
```bash
git clone https://github.com/search4asraful/urpwallet.git
cd urpwallet
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

### 4. (Optional) Load Sample Demo Data
To explore with pre-populated accounts, transactions, budgets, planned bills, and debts:
1. Open the web app.
2. Go to **Settings** in the sidebar.
3. Click **"Seed Sample Data"** under *Data Management & Reset*.

---

## 📦 Production Build & Deployment

To compile an optimized production build:

```bash
# 1. Build the Next.js application
npm run build

# 2. Start the production server
npm run start
```

By default, the server listens on port `3000`. You can change the port using:
```bash
npm run start -- -p 8080
```

---

## 🐳 Docker & Self-Hosting

You can containerize and self-host **urpwallet** using Docker:

### `Dockerfile`
Create a `Dockerfile` in the root directory:
```dockerfile
FROM node:20-alpine AS base

# Install build dependencies for better-sqlite3 on Alpine
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Install runtime dependencies for SQLite
RUN apk add --no-cache libstdc++

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/data ./data

# Persist data directory
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "run", "start"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  urpwallet:
    build: .
    container_name: urpwallet
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

Run with:
```bash
docker compose up -d
```

---

## ✨ Features Walkthrough

### 1. 📊 Financial Dashboard & Overview
- **Net Worth Card**: Aggregates all account balances in your chosen base currency.
- **Monthly Cash Flow**: Real-time summary of Total Income, Total Expenses, and Net Savings for the active month.
- **Account Carousel**: Quick balance cards with color accents and instant transfer buttons.
- **Active Budgets Tracker**: Visual gauges indicating spent vs. budget limits and dynamic safe-to-spend daily calculations.
- **Upcoming Bills**: Quick pay checklist for recurring obligations due in the next 14 days.
- **Recent Ledger Activity**: Clean timeline grouped by date with category icons and account identifiers.

### 2. 💳 Multi-Account & Wallets
- **Account Types**: Checking (Bank), Cash Wallets, Credit Cards, Savings & Goals, Investments, and Loans.
- **Account-Specific Currencies**: Each account can hold its own currency (USD, EUR, GBP, BDT, INR, CAD, AUD, JPY).
- **Direct Transfers**: Seamlessly transfer funds between accounts with automatic balance reconciliation.
- **Archive Accounts**: Safely hide inactive accounts without deleting historical transaction history.

### 3. 💸 Smart Transaction Logging
- **Unified Transaction Modal**: Quickly log **Expenses**, **Income**, or **Transfers**.
- **Compact & Smart Category Selector**: Grid-based category picker with instant live search and visual color highlights.
- **Amount Chips**: Fast keypad increment buttons (`+$10`, `+$50`, `+$100`).
- **Comprehensive Metadata**: Tag payment methods (Cash, Debit Card, Credit Card, Bank Transfer, Voucher, Mobile Pay), merchant/payee, date, time, and notes.
- **Advanced Filtering**: Filter by account, category, transaction type, or time frame.

### 4. 🎯 Budgets & Daily Safe-to-Spend
- Set category-specific or overall monthly spending limits.
- **Dynamic Color Warnings**:
  - 🟢 **Emerald**: Healthy spending (<80%)
  - 🟡 **Amber**: Approaching limit (80% - 99%)
  - 🔴 **Crimson**: Over-budget warning (≥100%)
- **Safe Daily Allowance**: Dynamically calculates `Remaining Budget / Remaining Days in Month` so you know exactly how much you can spend today.

### 5. ⏰ Planned Payments & Subscriptions
- Track recurring bills: Rent, Netflix, Spotify, utilities, gym memberships, and salary.
- Cadence options: Daily, Weekly, Monthly, or Yearly.
- **1-Click "Pay Now"**: Automatically records the transaction, adjusts the account balance, and advances the due date to the next cycle.

### 6. 🤝 Debts & Loan Tracker
- **Owed to Me**: Track personal loans given to friends, colleagues, or family.
- **I Owe**: Track money borrowed, student loans, or personal debts.
- **Repayment History**: Log partial or full repayments with optional real-time account balance updates.

### 7. 📈 Visual Analytics & Reports
- **Interactive Expense Donut Chart**: Breakdown of spending by category powered by Recharts.
- **Cash Flow History**: Period-over-period comparisons of income against expenses.
- **Savings Rate KPI**: Real-time percentage of income retained.

### 8. 🔄 Bi-Directional Data Portability
- **JSON Full Backup**: Export and import complete snapshots (accounts, categories, transactions, budgets, debts, and planned payments).
- **CSV Statements**: Export transactions to CSV (compatible with Excel, Apple Numbers, and Google Sheets) or import bank statement CSVs.
- **Merge vs. Replace Modes**: Choose between non-destructive merging (upserts and creates missing categories/accounts automatically) or a fresh full database restore.

### 9. 🎨 Themes & Customization
- **8 Colorways**: System Default, Crisp Light, Sleek Dark, OLED Pitch Black, Tokyo Night, Forest Green, Sunset Warmth, and Arctic Nord.
- **Custom Categories**: Create, color-code, and assign custom icons to categories.
- **Base Currency**: Set default currency across the application.

### 10. ☁️ Google Drive Cloud Backup & Scheduled Sync
- **Zero-Cloud-Lockin**: Connect your personal Google Drive account via OAuth 2.0 (`drive.file` scope only).
- **Automated Scheduled Backups**: Choose your sync cadence — Hourly, Every 6 Hours, Daily, or Weekly.
- **Retention & Auto-Pruning**: Keeps the last 5, 10, 20, or 30 backups in Drive and automatically prunes older ones to save space.
- **Remote Backups Explorer**: Browse, download, delete, or restore historical snapshots directly within the app.
- **Atomic Cloud Restore**: Restore any Google Drive backup safely with Merge or Full Replace strategies.
- **Headless Server & Cron Support**: Trigger scheduled syncs programmatically via `POST /api/gdrive/sync` from external schedulers or server crontabs.

---

## 🗄️ Data Storage & Persistence

**urpwallet** uses **SQLite 3** via the high-performance `better-sqlite3` driver:
- **Location**: Database file is stored locally at `data/wallet.db`.
- **Concurrency & Speed**: Runs with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for instantaneous non-blocking reads and writes.
- **Relational Integrity**: Foreign key constraints are enforced (`PRAGMA foreign_keys = ON;`).
- **Atomic Operations**: Critical multi-step routines (such as account transfers, balance recalculations, and imports) are executed inside atomic SQLite transactions (`db.transaction(...)`).

### Backing Up Your Data
To back up your data, you can either:
1. Export a **Full JSON Backup** from the **Settings** view in the UI.
2. Directly copy the `data/wallet.db` file to a secure location, flash drive, or personal cloud storage.

---

## 🔌 API Reference

All backend API routes return JSON and accept standard JSON payloads or `multipart/form-data` (for imports).

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/dashboard` | `GET` | Fetches aggregated net worth, cash flow, upcoming bills, and recent transactions. |
| `/api/accounts` | `GET`, `POST` | Lists all active accounts or creates a new account. |
| `/api/accounts/[id]` | `PUT`, `DELETE` | Updates account details or archives/deletes an account. |
| `/api/transactions` | `GET`, `POST` | Queries transactions (with query filters) or logs a new transaction/transfer. |
| `/api/transactions/[id]` | `GET`, `PUT`, `DELETE` | Retrieves, modifies, or deletes a transaction with balance rollbacks. |
| `/api/categories` | `GET`, `POST` | Lists categories or creates a custom category. |
| `/api/categories/[id]` | `DELETE` | Deletes a category (blocks deletion if linked to transactions). |
| `/api/budgets` | `GET`, `POST` | Lists budget thresholds with spent amounts or creates a budget. |
| `/api/budgets/[id]` | `PUT`, `DELETE` | Updates or deletes a budget. |
| `/api/planned` | `GET`, `POST` | Lists scheduled recurring payments or adds a new bill. |
| `/api/planned/[id]/execute` | `POST` | Executes a planned bill (creates real transaction & advances due date). |
| `/api/debts` | `GET`, `POST` | Lists debts & loans or records a new debt. |
| `/api/debts/[id]/pay` | `POST` | Records a full or partial debt repayment. |
| `/api/export` | `GET` | Exports complete JSON backup (`?format=json`) or CSV ledger (`?format=csv`). |
| `/api/import` | `POST` | Ingests JSON backup or CSV bank statement with `merge` or `replace` mode. |
| `/api/settings` | `GET`, `POST` | Gets or updates base currency and privacy mode. |
| `/api/seed` | `POST` | Resets and repopulates the database with realistic sample demo data. |
| `/api/gdrive/status` | `GET` | Returns Google Drive connection state, schedule, and account email. |
| `/api/gdrive/auth-url` | `GET` | Generates OAuth 2.0 authorization URL for Google Drive. |
| `/api/gdrive/callback` | `GET` | Handles OAuth 2.0 redirect, token exchange, and persistence. |
| `/api/gdrive/config` | `POST` | Updates client ID, secret, backup cadence, and retention limits. |
| `/api/gdrive/disconnect` | `POST` | Disconnects Google Drive and revokes stored tokens. |
| `/api/gdrive/backup` | `POST` | Triggers an immediate snapshot upload to Google Drive. |
| `/api/gdrive/backups` | `GET` | Lists all backup snapshots available in Google Drive. |
| `/api/gdrive/backups/[id]` | `DELETE` | Deletes a specific backup snapshot from Google Drive. |
| `/api/gdrive/restore` | `POST` | Downloads and restores a backup from Google Drive (Merge or Replace). |
| `/api/gdrive/sync` | `POST` | Checks schedule eligibility and syncs backup if due (or forced). |

---

## 🛠️ Development & Quality Assurance

### Linting
Check code quality and ESLint rules:
```bash
npm run lint
```

### Type Checking
Validate TypeScript types across the entire codebase:
```bash
npx tsc --noEmit
```

### Production Build Verification
Test that the Next.js Turbopack build succeeds without errors:
```bash
npm run build
```

---

## 🤝 Contributing

Contributions from the community are warmly welcome! Whether you are fixing bugs, improving docs, adding new currency formats, or proposing features:

1. **Fork the Repository** on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Your Changes**:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push to Your Branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request** describing your changes and verification steps.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

---

<p align="center">
  Crafted with care for personal financial freedom.
</p>
