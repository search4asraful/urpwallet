'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { DashboardData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, StatCard, EmptyState } from '@/components/ui';

interface ReportsViewProps {
  data: DashboardData;
  privacyMode: boolean;
  baseCurrency: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  data,
  privacyMode,
  baseCurrency,
}) => {
  const { categoryBreakdown, cashFlowTrend, monthlyIncome, monthlyExpense } = data;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pieData = (categoryBreakdown || [])
    .filter((cat) => cat.total > 0)
    .map((cat) => ({
      name: cat.name,
      value: cat.total,
      color: cat.color,
      icon: cat.icon,
      percentage: cat.percentage,
    }));

  const activeItem = activeCategory
    ? pieData.find((p) => p.name === activeCategory)
    : null;

  const savingsRate =
    monthlyIncome > 0
      ? Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100))
      : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* 3 Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Total Inflow"
          value={
            <span className="text-emerald-500">
              {formatCurrency(monthlyIncome, baseCurrency, privacyMode)}
            </span>
          }
          icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          subtitle="Recorded this month"
        />

        <StatCard
          label="Total Outflow"
          value={
            <span className="text-rose-500">
              {formatCurrency(monthlyExpense, baseCurrency, privacyMode)}
            </span>
          }
          icon={<TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
          subtitle="Recorded this month"
        />

        <StatCard
          label="Savings Rate"
          value={<span className="text-sky-500">{savingsRate}%</span>}
          icon={<Percent className="w-3.5 h-3.5 text-sky-500" />}
          subtitle="Retained income ratio"
        />
      </div>

      {/* Chart 1: Donut Breakdown */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-theme-title">Expense Distribution</h2>
            <p className="text-[11px] text-theme-muted">By category for current billing cycle</p>
          </div>
          <span className="text-xs font-semibold text-theme-main tabular-nums">
            Total: {formatCurrency(monthlyExpense, baseCurrency, privacyMode)}
          </span>
        </div>

        {pieData.length === 0 ? (
          <EmptyState
            icon={<PieChartIcon className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
            title="No expense data recorded"
            description="Log expenses to see dynamic category breakdowns."
            className="py-10 border-0 bg-transparent shadow-none"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Donut Chart */}
            <div className="lg:col-span-6 min-h-[260px] h-64 w-full relative flex items-center justify-center">
              {mounted ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={96}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) =>
                          setActiveCategory(pieData[index]?.name || null)
                        }
                        onMouseLeave={() => setActiveCategory(null)}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="var(--bg-card)"
                            strokeWidth={2}
                            opacity={activeCategory && activeCategory !== entry.name ? 0.45 : 1}
                            className="transition-opacity duration-150 cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [
                          formatCurrency(Number(val) || 0, baseCurrency, privacyMode),
                          'Spent',
                        ]}
                        contentStyle={{
                          backgroundColor: 'var(--chart-tooltip-bg)',
                          borderRadius: '12px',
                          border: '1px solid var(--chart-tooltip-border)',
                          color: 'var(--chart-tooltip-text)',
                          fontSize: '11px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>

                  {/* Center Stat Display */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none max-w-[130px] px-2">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-theme-faint truncate">
                      {activeItem ? activeItem.name : 'Monthly Spend'}
                    </div>
                    <div className="text-xs font-extrabold text-theme-title tabular-nums mt-0.5">
                      {formatCurrency(
                        activeItem ? activeItem.value : monthlyExpense,
                        baseCurrency,
                        privacyMode
                      )}
                    </div>
                    {activeItem && (
                      <div className="text-[10px] text-theme-muted font-medium">
                        {activeItem.percentage}% of total
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-dashed border-theme animate-pulse flex items-center justify-center text-xs text-theme-muted" />
              )}
            </div>

            {/* Category breakdown legend */}
            <div className="lg:col-span-6 space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {pieData.map((item) => {
                const isActive = activeCategory === item.name;
                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setActiveCategory(item.name)}
                    onMouseLeave={() => setActiveCategory(null)}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-theme-subtle border border-theme shadow-xs'
                        : 'hover:bg-theme-subtle border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] shrink-0 shadow-xs"
                        style={{ backgroundColor: item.color }}
                      >
                        <CategoryIcon name={item.icon} className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-theme-title">{item.name}</div>
                        <div className="text-[10px] text-theme-muted">{item.percentage}% of spend</div>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-theme-main tabular-nums">
                      {formatCurrency(item.value, baseCurrency, privacyMode)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Chart 2: Cash Flow Trend */}
      <Card className="p-5 md:p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-theme-title">Weekly Cash Flow Trends</h2>
          <p className="text-[11px] text-theme-muted">Inflow vs. Outflow comparisons</p>
        </div>

        {cashFlowTrend.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
            title="No cash flow history available yet"
            description="Trends will automatically generate as entries are added."
            className="py-10 border-0 bg-transparent shadow-none"
          />
        ) : (
          <div className="min-h-[260px] h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cashFlowTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (privacyMode) return '•••';
                      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                      return String(val);
                    }}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      formatCurrency(Number(val) || 0, baseCurrency, privacyMode),
                      name === 'income' ? 'Income' : 'Expense',
                    ]}
                    contentStyle={{
                      backgroundColor: 'var(--chart-tooltip-bg)',
                      borderRadius: '12px',
                      border: '1px solid var(--chart-tooltip-border)',
                      color: 'var(--chart-tooltip-text)',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(val) => (val === 'income' ? 'Income' : 'Expense')}
                  />
                  <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-theme-muted">
                Loading analytics trends...
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
