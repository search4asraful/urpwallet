'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, FileSpreadsheet, RefreshCw, Layers } from 'lucide-react';
import { Account } from '@/types';
import { Modal, Button, Select, Badge } from '@/components/ui';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [defaultAccountId, setDefaultAccountId] = useState<string>(accounts[0]?.id || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    imported: {
      transactions: number;
      accounts: number;
      categories: number;
      budgets: number;
      debts: number;
      bills_subscriptions: number;
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const resetState = () => {
    setFile(null);
    setError(null);
    setSuccessResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    setSuccessResult(null);
    if (!selectedFile) return;

    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith('.json') && !ext.endsWith('.csv')) {
      setError('Please upload a valid .json backup or .csv ledger file.');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to import.');
      return;
    }

    if (mode === 'replace') {
      const confirmReplace = confirm(
        'Warning: "Full Replace" will wipe your current database records and restore from the file. Are you sure?'
      );
      if (!confirmReplace) return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      if (defaultAccountId) {
        formData.append('defaultAccountId', defaultAccountId);
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setSuccessResult({
        message: data.message,
        imported: data.imported,
      });
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  };

  const isCsv = file?.name.toLowerCase().endsWith('.csv');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Ledger Data"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-500 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Import Completed Successfully!</span>
            </div>
            <p className="text-theme-sub font-medium">{successResult.message}</p>
            <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
              <Badge variant="emerald" size="sm">
                {successResult.imported.transactions} Transactions
              </Badge>
              {successResult.imported.accounts > 0 && (
                <Badge variant="sky" size="sm">
                  {successResult.imported.accounts} Accounts
                </Badge>
              )}
              {successResult.imported.categories > 0 && (
                <Badge variant="purple" size="sm">
                  {successResult.imported.categories} Categories
                </Badge>
              )}
            </div>
          </div>
        )}

        {!successResult && (
          <>
            {/* File Upload Zone */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.csv"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />

            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                    : 'border-theme hover:border-emerald-500/50 bg-theme-subtle hover:bg-theme-subtle-hover'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme flex items-center justify-center text-theme-muted group-hover:text-emerald-500 shadow-xs">
                  <Upload className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-theme-title">
                    Click to browse or drop file here
                  </div>
                  <p className="text-[11px] text-theme-muted mt-0.5">
                    Supports JSON full database backup or CSV transaction ledger
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral" size="xs">
                    .JSON
                  </Badge>
                  <Badge variant="neutral" size="xs">
                    .CSV
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-theme-subtle border border-theme rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme flex items-center justify-center text-theme-muted shrink-0 shadow-xs">
                    {file.name.endsWith('.csv') ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-sky-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-theme-title truncate max-w-[240px] sm:max-w-xs">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-theme-muted flex items-center gap-2 mt-0.5">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="uppercase font-semibold text-emerald-500">
                        {file.name.split('.').pop()} format
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-theme-muted hover:text-rose-500"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Import Mode Selection */}
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-semibold text-theme-muted select-none">
                Import Strategy
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setMode('merge')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    mode === 'merge'
                      ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/25'
                      : 'bg-theme-subtle border-theme hover:bg-theme-subtle-hover'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className={`w-3.5 h-3.5 ${mode === 'merge' ? 'text-emerald-500' : 'text-theme-muted'}`} />
                    <span className={`text-xs font-bold ${mode === 'merge' ? 'text-theme-title' : 'text-theme-sub'}`}>
                      Merge (Safe)
                    </span>
                  </div>
                  <p className="text-[10px] text-theme-muted leading-tight">
                    Appends new records and updates matching ones without deleting current data.
                  </p>
                </div>

                <div
                  onClick={() => setMode('replace')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    mode === 'replace'
                      ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/25'
                      : 'bg-theme-subtle border-theme hover:bg-theme-subtle-hover'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className={`w-3.5 h-3.5 ${mode === 'replace' ? 'text-rose-500' : 'text-theme-muted'}`} />
                    <span className={`text-xs font-bold ${mode === 'replace' ? 'text-rose-500' : 'text-theme-sub'}`}>
                      Full Replace
                    </span>
                  </div>
                  <p className="text-[10px] text-theme-muted leading-tight">
                    Wipes existing tables and performs a clean restore from backup.
                  </p>
                </div>
              </div>
            </div>

            {/* Target Account fallback for CSV */}
            {isCsv && accounts.length > 0 && (
              <Select
                label="Fallback Account (for CSV entries without an account column)"
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-theme-card text-theme-title">
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </Select>
            )}
          </>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            {successResult ? 'Done' : 'Cancel'}
          </Button>

          {!successResult && (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
              disabled={!file || loading}
              leftIcon={<Upload className="w-3.5 h-3.5 stroke-[2.5]" />}
            >
              Start Import
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
