import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Account, Category } from '@/types';

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const entries: string[] = [];
    let entry = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const nc = line[i + 1];
      if (c === '"') {
        if (inQ && nc === '"') {
          entry += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        entries.push(entry.trim());
        entry = '';
      } else {
        entry += c;
      }
    }
    entries.push(entry.trim());
    return entries;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }
  return records;
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.errorResponse) return auth.errorResponse;

    const db = getDb();
    const contentType = req.headers.get('content-type') || '';

    let contentStr = '';
    let format = 'json';
    let mode = 'merge'; // 'merge' | 'replace'
    let defaultAccountId: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }
      contentStr = await file.text();
      format = file.name.endsWith('.csv') ? 'csv' : 'json';
      mode = (formData.get('mode') as string) || 'merge';
      defaultAccountId = (formData.get('defaultAccountId') as string) || undefined;
    } else {
      const body = await req.json();
      const rawContent = body.content !== undefined ? body.content : (body.data !== undefined ? body.data : body);
      contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      const trimmed = (contentStr || '').trim();
      format = body.format || (trimmed.startsWith('{') || trimmed.startsWith('[') ? 'json' : 'csv');
      mode = body.mode || 'merge';
      defaultAccountId = body.defaultAccountId || undefined;
    }

    if (mode === 'replace' && auth.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Full database replace import requires Administrator role' },
        { status: 403 }
      );
    }

    if (!contentStr || !contentStr.trim()) {
      return NextResponse.json({ error: 'Import content is empty' }, { status: 400 });
    }

    const counts = {
      accounts: 0,
      categories: 0,
      transactions: 0,
      budgets: 0,
      bills_subscriptions: 0,
      debts: 0,
      settings: 0,
    };

    const now = new Date().toISOString();

    // Run all imports atomically
    const runImport = db.transaction(() => {
      if (mode === 'replace') {
        db.exec(`
          DELETE FROM transactions;
          DELETE FROM budgets;
          DELETE FROM bills_subscriptions;
          DELETE FROM debts;
          DELETE FROM accounts;
          DELETE FROM categories;
        `);
      }

      // Check format
      const isJson = format === 'json' || contentStr.trim().startsWith('{') || contentStr.trim().startsWith('[');

      if (isJson) {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(contentStr);
        } catch {
          throw new Error('Invalid JSON file format');
        }

        // If it's an array of transactions
        if (Array.isArray(parsed)) {
          parsed = { transactions: parsed };
        }

        // 1. Categories
        if (Array.isArray(parsed.categories)) {
          const insertCat = db.prepare(`
            INSERT INTO categories (id, name, type, icon, color, parent_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              type = excluded.type,
              icon = excluded.icon,
              color = excluded.color
          `);

          for (const c of parsed.categories as Record<string, unknown>[]) {
            if (c.id && c.name) {
              const catType = String(c.type || c.category_type || 'expense');
              insertCat.run(
                String(c.id),
                String(c.name),
                catType,
                String(c.icon || 'CircleDollarSign'),
                String(c.color || '#64748B'),
                c.parent_id ? String(c.parent_id) : null,
                String(c.created_at || now)
              );
              counts.categories++;
            }
          }
        }

        // 2. Accounts
        if (Array.isArray(parsed.accounts)) {
          const insertAcc = db.prepare(`
            INSERT INTO accounts (id, name, type, currency, balance, color, icon, is_archived, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              type = excluded.type,
              currency = excluded.currency,
              balance = excluded.balance,
              color = excluded.color,
              icon = excluded.icon,
              is_archived = excluded.is_archived,
              updated_at = excluded.updated_at
          `);

          for (const a of parsed.accounts as Record<string, unknown>[]) {
            if (a.id && a.name) {
              const accType = String(a.type || a.account_type || 'bank');
              const isArchived = a.is_archived === true || a.is_archived === 1 || a.is_archived === '1' ? 1 : 0;
              insertAcc.run(
                String(a.id),
                String(a.name),
                accType,
                String(a.currency || 'USD'),
                Number(a.balance) || 0,
                String(a.color || '#3B82F6'),
                String(a.icon || 'Wallet'),
                isArchived,
                String(a.created_at || now),
                String(a.updated_at || now)
              );
              counts.accounts++;
            }
          }
        }

        // 3. Budgets
        if (Array.isArray(parsed.budgets)) {
          const insertBud = db.prepare(`
            INSERT INTO budgets (id, name, amount, period, category_id, start_date, end_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              amount = excluded.amount,
              period = excluded.period,
              start_date = excluded.start_date,
              end_date = excluded.end_date
          `);

          for (const b of parsed.budgets as Record<string, unknown>[]) {
            if (b.id && b.name && b.amount) {
              insertBud.run(
                String(b.id),
                String(b.name),
                Number(b.amount),
                String(b.period || 'monthly'),
                b.category_id ? String(b.category_id) : null,
                String(b.start_date || now.split('T')[0]),
                String(b.end_date || now.split('T')[0]),
                String(b.created_at || now)
              );
              counts.budgets++;
            }
          }
        }

        // 4. Debts
        if (Array.isArray(parsed.debts)) {
          const insertDebt = db.prepare(`
            INSERT INTO debts (id, type, person_name, amount, settled_amount, due_date, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              person_name = excluded.person_name,
              amount = excluded.amount,
              settled_amount = excluded.settled_amount,
              due_date = excluded.due_date,
              notes = excluded.notes,
              status = excluded.status
          `);

          for (const d of parsed.debts as Record<string, unknown>[]) {
            if (d.id && d.person_name && d.amount) {
              const debtType = String(d.type || d.debt_type || 'debt_i_owe');
              insertDebt.run(
                String(d.id),
                debtType,
                String(d.person_name),
                Number(d.amount),
                Number(d.settled_amount) || 0,
                d.due_date ? String(d.due_date) : null,
                d.notes ? String(d.notes) : null,
                String(d.status || 'active'),
                String(d.created_at || now)
              );
              counts.debts++;
            }
          }
        }

        // 5. Bills & Subscriptions / Planned Payments
        const rawBills = Array.isArray(parsed.bills_subscriptions)
          ? parsed.bills_subscriptions
          : (Array.isArray(parsed.planned_payments) ? parsed.planned_payments : null);

        if (Array.isArray(rawBills)) {
          const insertBill = db.prepare(`
            INSERT INTO bills_subscriptions (id, name, amount, type, account_id, category_id, payee, frequency, next_date, auto_record, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              amount = excluded.amount,
              type = excluded.type,
              account_id = excluded.account_id,
              category_id = excluded.category_id,
              payee = excluded.payee,
              frequency = excluded.frequency,
              next_date = excluded.next_date,
              auto_record = excluded.auto_record,
              is_active = excluded.is_active
          `);

          for (const p of rawBills as Record<string, unknown>[]) {
            if (p.id && p.name && p.amount && p.account_id) {
              const billType = String(p.type || p.bill_type || 'expense');
              const autoRecord = p.auto_record === true || p.auto_record === 1 || p.auto_record === '1' ? 1 : 0;
              const isActive = p.is_active !== undefined ? (p.is_active === true || p.is_active === 1 || p.is_active === '1' ? 1 : 0) : 1;

              insertBill.run(
                String(p.id),
                String(p.name),
                Number(p.amount),
                billType,
                String(p.account_id),
                p.category_id ? String(p.category_id) : null,
                p.payee ? String(p.payee) : null,
                String(p.frequency || 'monthly'),
                String(p.next_date || now.split('T')[0]),
                autoRecord,
                isActive,
                String(p.created_at || now)
              );
              counts.bills_subscriptions++;
            }
          }
        }

        // 6. Transactions
        if (Array.isArray(parsed.transactions)) {
          const insertTx = db.prepare(`
            INSERT INTO transactions (id, account_id, to_account_id, category_id, type, amount, currency, date, time, payee, note, status, payment_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              account_id = excluded.account_id,
              to_account_id = excluded.to_account_id,
              category_id = excluded.category_id,
              type = excluded.type,
              amount = excluded.amount,
              currency = excluded.currency,
              date = excluded.date,
              time = excluded.time,
              payee = excluded.payee,
              note = excluded.note,
              status = excluded.status,
              payment_type = excluded.payment_type
          `);

          const existingAccounts = db.prepare('SELECT id, name, currency FROM accounts').all() as Account[];
          const existingCategories = db.prepare('SELECT id, name FROM categories').all() as Category[];

          for (const tx of parsed.transactions as Record<string, unknown>[]) {
            const txId = tx.id ? String(tx.id) : 'tx_' + Math.random().toString(36).substring(2, 9);
            const amount = Number(tx.amount);
            if (isNaN(amount) || amount <= 0) continue;

            // Resolve Account
            let accId = tx.account_id ? String(tx.account_id) : '';
            if (!accId && tx.account) {
              const matched = existingAccounts.find((a) => a.name.toLowerCase() === String(tx.account).toLowerCase());
              if (matched) accId = matched.id;
            }
            if (!accId) {
              accId = defaultAccountId || existingAccounts[0]?.id || '';
            }
            if (!accId) {
              // Create default account if database has none
              accId = 'acc_imported';
              db.prepare(`
                INSERT INTO accounts (id, name, type, currency, balance, color, icon, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, '#3B82F6', 'Wallet', ?, ?)
              `).run(accId, 'Default Account', 'bank', String(tx.currency || 'USD'), now, now);
              existingAccounts.push({ id: accId, name: 'Default Account', currency: String(tx.currency || 'USD') } as Account);
              counts.accounts++;
            }

            // Resolve To Account (for transfer)
            let toAccId = tx.to_account_id ? String(tx.to_account_id) : null;
            if (!toAccId && tx.to_account) {
              const matchedTo = existingAccounts.find((a) => a.name.toLowerCase() === String(tx.to_account).toLowerCase());
              if (matchedTo) toAccId = matchedTo.id;
            }

            // Resolve Category
            let catId = tx.category_id ? String(tx.category_id) : null;
            if (!catId && tx.category) {
              const matchedCat = existingCategories.find((c) => c.name.toLowerCase() === String(tx.category).toLowerCase());
              if (matchedCat) catId = matchedCat.id;
            }

            const targetAcc = existingAccounts.find((a) => a.id === accId);
            const currency = String(tx.currency || targetAcc?.currency || 'USD');
            const txType = String(tx.type || tx.tx_type || 'expense');

            insertTx.run(
              txId,
              accId,
              toAccId,
              catId,
              txType,
              amount,
              currency,
              String(tx.date || now.split('T')[0]),
              tx.time ? String(tx.time) : null,
              tx.payee ? String(tx.payee) : null,
              tx.note ? String(tx.note) : null,
              String(tx.status || 'cleared'),
              String(tx.payment_type || 'cash'),
              String(tx.created_at || now)
            );
            counts.transactions++;
          }
        }

        // 7. Settings
        if (parsed.settings) {
          const insertSetting = db.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `);

          if (Array.isArray(parsed.settings)) {
            for (const s of parsed.settings) {
              if (Array.isArray(s) && s.length >= 2) {
                insertSetting.run(String(s[0]), String(s[1]));
                counts.settings++;
              } else if (typeof s === 'object' && s !== null && 'key' in s && 'value' in s) {
                const item = s as { key: string; value: string };
                insertSetting.run(String(item.key), String(item.value));
                counts.settings++;
              }
            }
          } else if (typeof parsed.settings === 'object' && parsed.settings !== null) {
            for (const [k, v] of Object.entries(parsed.settings as Record<string, unknown>)) {
              insertSetting.run(k, String(v));
              counts.settings++;
            }
          }
        }
      } else {
        // CSV Ledger Import
        const records = parseCSV(contentStr);
        if (records.length === 0) {
          throw new Error('No valid records found in CSV');
        }

        const existingAccounts = db.prepare('SELECT id, name, currency FROM accounts').all() as Account[];
        const existingCategories = db.prepare('SELECT id, name FROM categories').all() as Category[];

        const insertTx = db.prepare(`
          INSERT INTO transactions (id, account_id, to_account_id, category_id, type, amount, currency, date, time, payee, note, status, payment_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            account_id = excluded.account_id,
            to_account_id = excluded.to_account_id,
            category_id = excluded.category_id,
            type = excluded.type,
            amount = excluded.amount,
            currency = excluded.currency,
            date = excluded.date,
            time = excluded.time,
            payee = excluded.payee,
            note = excluded.note,
            status = excluded.status,
            payment_type = excluded.payment_type
        `);

        for (const row of records) {
          // Normalize column values
          const rawAmount = row.amount || row.total || row.value || row.sum || '';
          const numAmount = Math.abs(parseFloat(rawAmount.replace(/[^0-9.-]/g, '')));
          if (isNaN(numAmount) || numAmount <= 0) continue;

          // Determine type
          let txType = (row.type || '').toLowerCase();
          if (!['income', 'expense', 'transfer'].includes(txType)) {
            if (rawAmount.startsWith('-')) {
              txType = 'expense';
            } else if (parseFloat(rawAmount) > 0) {
              txType = 'expense'; // default expense
            } else {
              txType = 'expense';
            }
          }

          // Date & Time
          let date = row.date || row.trans_date || row.timestamp || now.split('T')[0];
          // If date is like MM/DD/YYYY or DD/MM/YYYY, try to convert to YYYY-MM-DD
          if (date.includes('/')) {
            const parts = date.split('/');
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
              }
            }
          }
          const time = row.time || null;

          // Payee & Note
          const payee = row.payee || row.description || row.merchant || row.name || null;
          const note = row.note || row.memo || row.details || null;
          const paymentType = row.payment_type || row.method || 'cash';
          const status = row.status || 'cleared';

          // Resolve Account
          const accName = row.account || row.account_name || '';
          let accId = defaultAccountId || '';
          if (accName) {
            const matched = existingAccounts.find((a) => a.name.toLowerCase() === accName.toLowerCase());
            if (matched) {
              accId = matched.id;
            } else {
              // Create account on the fly
              accId = 'acc_' + Math.random().toString(36).substring(2, 9);
              db.prepare(`
                INSERT INTO accounts (id, name, type, currency, balance, color, icon, created_at, updated_at)
                VALUES (?, ?, 'bank', ?, 0, '#3B82F6', 'CreditCard', ?, ?)
              `).run(accId, accName, String(row.currency || 'USD'), now, now);
              existingAccounts.push({ id: accId, name: accName, currency: String(row.currency || 'USD') } as Account);
              counts.accounts++;
            }
          }
          if (!accId && existingAccounts.length > 0) {
            accId = existingAccounts[0].id;
          }
          if (!accId) {
            accId = 'acc_primary';
            db.prepare(`
              INSERT INTO accounts (id, name, type, currency, balance, color, icon, created_at, updated_at)
              VALUES (?, ?, 'bank', 'USD', 0, '#3B82F6', 'CreditCard', ?, ?)
            `).run(accId, 'Primary Account', now, now);
            existingAccounts.push({ id: accId, name: 'Primary Account', currency: 'USD' } as Account);
            counts.accounts++;
          }

          // Resolve To Account (if transfer)
          let toAccId: string | null = null;
          const toAccName = row.to_account || '';
          if (toAccName) {
            const matchedTo = existingAccounts.find((a) => a.name.toLowerCase() === toAccName.toLowerCase());
            if (matchedTo) toAccId = matchedTo.id;
          }

          // Resolve Category
          const catName = row.category || row.category_name || '';
          let catId: string | null = null;
          if (catName) {
            const matchedCat = existingCategories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
            if (matchedCat) {
              catId = matchedCat.id;
            } else {
              // Create category on the fly
              catId = 'cat_' + Math.random().toString(36).substring(2, 9);
              db.prepare(`
                INSERT INTO categories (id, name, type, icon, color, created_at)
                VALUES (?, ?, ?, 'CircleDollarSign', '#64748B', ?)
              `).run(catId, catName, txType === 'income' ? 'income' : 'expense', now);
              existingCategories.push({ id: catId, name: catName } as Category);
              counts.categories++;
            }
          }

          const targetAcc = existingAccounts.find((a) => a.id === accId);
          const currency = row.currency || targetAcc?.currency || 'USD';
          const txId = row.id || 'tx_' + Math.random().toString(36).substring(2, 9);

          insertTx.run(
            txId,
            accId,
            toAccId,
            catId,
            txType,
            numAmount,
            currency,
            date,
            time,
            payee,
            note,
            status,
            paymentType,
            now
          );
          counts.transactions++;
        }
      }

      // Synchronize transaction currencies with their respective accounts
      db.prepare(`
        UPDATE transactions
        SET currency = (SELECT currency FROM accounts WHERE accounts.id = transactions.account_id)
        WHERE account_id IN (SELECT id FROM accounts)
      `).run();

      // Recalculate account balances based on imported transactions
      const accountsList = db.prepare('SELECT id FROM accounts').all() as { id: string }[];
      for (const a of accountsList) {
        const incomeRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (account_id = ? AND type = 'income') OR (to_account_id = ? AND type = 'transfer')`).get(a.id, a.id) as { total: number };
        const expenseRow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (account_id = ? AND type IN ('expense', 'transfer'))`).get(a.id) as { total: number };

        // If replace mode or accounts were re-calculated:
        // Update account balance
        if (mode === 'replace') {
          const newBal = incomeRow.total - expenseRow.total;
          db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, a.id);
        }
      }
    });

    runImport();

    return NextResponse.json({
      success: true,
      mode,
      imported: counts,
      message: `Successfully imported ${counts.transactions} transactions, ${counts.accounts} accounts, and ${counts.categories} categories.`,
    });
  } catch (error: unknown) {
    console.error('Import error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
