'use client';

import React from 'react';
import { Edit3, Trash2, Calendar, CreditCard, Tag, FileText, ArrowLeftRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Modal, Button, Badge } from '@/components/ui';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  privacyMode: boolean;
  baseCurrency: string;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  privacyMode,
  baseCurrency,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!transaction) return null;

  const txCurrency = transaction.account_currency || transaction.currency || baseCurrency || 'USD';

  const handleDelete = () => {
    if (confirm('Delete this transaction and reverse its balance effect?')) {
      onDelete(transaction.id);
      onClose();
    }
  };

  const headerActions = (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          onClose();
          onEdit(transaction);
        }}
        title="Edit transaction"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        className="hover:text-rose-500"
        title="Delete transaction"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Details"
      headerActions={headerActions}
      maxWidth="sm"
    >
      {/* Amount Hero */}
      <div className="p-5 text-center border-b border-theme bg-theme-subtle">
        <div
          className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-white mb-2 shadow-xs"
          style={{
            backgroundColor: transaction.type === 'transfer' ? '#0ea5e9' : transaction.category_color || '#10B981',
          }}
        >
          {transaction.type === 'transfer' ? (
            <ArrowLeftRight className="w-5 h-5" />
          ) : (
            <CategoryIcon name={transaction.category_icon || 'CircleDollarSign'} className="w-5 h-5" />
          )}
        </div>

        <h3 className="text-sm font-semibold text-theme-title">
          {transaction.type === 'transfer'
            ? 'Account Transfer'
            : transaction.payee || transaction.category_name || 'Transaction'}
        </h3>

        <div className={`text-2xl font-extrabold mt-0.5 tabular-nums ${
          transaction.type === 'income'
            ? 'text-emerald-500'
            : transaction.type === 'expense'
            ? 'text-rose-500'
            : 'text-sky-500'
        }`}>
          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
          {formatCurrency(transaction.amount, txCurrency, privacyMode)}
        </div>
      </div>

      {/* Detailed Rows */}
      <div className="p-5 space-y-3 text-xs">
        {/* Account */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="flex items-center gap-1.5 text-theme-muted">
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Account
          </span>
          <span className="font-semibold text-theme-title">
            {transaction.account_name}
            {transaction.to_account_name && ` ➔ ${transaction.to_account_name}`}
          </span>
        </div>

        {/* Category */}
        {transaction.category_name && transaction.type !== 'transfer' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-theme-muted">
              <Tag className="w-3.5 h-3.5 text-emerald-500" /> Category
            </span>
            <span className="font-semibold text-theme-title flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: transaction.category_color }}
              />
              {transaction.category_name}
            </span>
          </div>
        )}

        {/* Date & Time */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-theme-muted">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Date & Time
          </span>
          <span className="font-semibold text-theme-title">
            {formatDate(transaction.date)} {transaction.time ? `at ${transaction.time}` : ''}
          </span>
        </div>

        {/* Payment Method */}
        <div className="flex items-center justify-between">
          <span className="text-theme-muted">Method</span>
          <span className="font-semibold text-theme-title capitalize">
            {transaction.payment_type.replace('_', ' ')}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-theme-muted">Status</span>
          <Badge variant={transaction.status === 'cleared' ? 'success' : 'neutral'} dot>
            <span className="capitalize">{transaction.status}</span>
          </Badge>
        </div>

        {/* Note */}
        {transaction.note && (
          <div className="pt-2.5">
            <span className="flex items-center gap-1.5 text-theme-muted mb-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" /> Note
            </span>
            <p className="text-theme-main bg-theme-subtle p-2.5 rounded-b-xl rounded-tr-xl border border-theme text-xs leading-relaxed">
              {transaction.note}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
