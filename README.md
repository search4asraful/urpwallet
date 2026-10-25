# urpwallet — Your Personal Wallet

<p align="center">
  <img src="public/icon.svg" alt="urpwallet Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>An open-source, privacy-first personal finance tracker and budget planner.</strong><br />
  Your financial data stays on your machine — 100% local, fast, and completely free.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/SQLite-Local_Storage-003B57?style=flat&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat" alt="MIT License" />
</p>

---

## ✨ Features

- 🔒 **100% Private & Local**: Your data is stored locally in an embedded SQLite database. No external servers or cloud lock-in.
- 🔐 **Authentication & Roles**: Protected by per-user 128-bit cryptographic salts and scrypt hashing, with Admin and Member authorization.
- 💳 **Multi-Account & Multi-Currency**: Manage bank accounts, cash wallets, credit cards, savings goals, and debts with independent currencies.
- 🎯 **Budgets & Safe-to-Spend**: Set monthly category limits and see an automatic calculation of how much you can safely spend each day.
- ⏰ **Bills & Subscriptions**: Track recurring expenses (rent, subscriptions, utilities) with 1-click payment logging.
- 🤝 **Debts & Loans**: Track money lent to friends or borrowed amounts with partial payment logging.
- 📊 **Visual Analytics**: Interactive expense breakdowns, monthly cash-flow trends, and savings rate KPIs.
- ☁️ **Backups & Portability**: 1-click JSON and CSV export/import, plus optional Google Drive backup sync.
- 🎨 **8 Themes & Privacy Mode**: Light, dark, OLED black, Tokyo Night, Nord, Forest, and a quick balance mask (`••••••`) for public use.

---

## 🚀 Quickstart

You only need **[Node.js](https://nodejs.org)** (v18 or newer) installed.

### 1. Clone the repository
```bash
git clone https://github.com/search4asraful/urpwallet.git
cd urpwallet
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. That's it! 🎉

> 💡 **Newbie Tip**: Want to try it out with data right away?  
> Go to **Settings** in the sidebar and click **"Seed Sample Data"** to load realistic demo accounts, transactions, and budgets with one click.

---

## 🗄️ Where is My Data Stored?

All your data is saved locally on your computer inside:
```
data/wallet.db
```
- **Backup**: You can copy `data/wallet.db` anytime, or go to **Settings > Export** to download a JSON or CSV backup.
- **Restore**: Import your backup file anytime from the **Settings** page.

---

## 🛠️ Handy Commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Runs the app in development mode at `localhost:3000` |
| `npm run build` | Builds the optimized production version |
| `npm run start` | Starts the production server |
| `npm run lint` | Checks code formatting and catches potential bugs |

---

## 🧱 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Database**: SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts & Icons**: [Recharts](https://recharts.org/) & [Lucide React](https://lucide.dev/)

---

## 🤝 Contributing

Contributions are welcome! If you'd like to fix a bug or add a feature:
1. Fork the repo and create your branch (`git checkout -b feature/my-feature`).
2. Make and commit your changes (`git commit -m "Add my feature"`).
3. Push to your fork (`git push origin feature/my-feature`).
4. Open a Pull Request.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
