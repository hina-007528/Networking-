'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes } from '@stormfiber/config';
import type { DashboardChartsDto, DashboardMetricsDto, Paginated, TicketDto } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

function money(value: number, currency = 'PKR') {
  return `${currency === 'PKR' ? 'Rs' : currency} ${Math.round(value).toLocaleString('en-PK')}`;
}

function BarChart({ series }: { series: { date: string; value: number }[] }) {
  const points = series.slice(-8);
  const max = Math.max(...points.map((p) => p.value), 1);
  const barW = 28;
  const gap = 16;
  const chartH = 140;
  const totalW = Math.max(points.length * (barW + gap) - gap, 40);

  if (!points.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No chart data yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg width={totalW + 24} height={chartH + 44} viewBox={`0 0 ${totalW + 24} ${chartH + 44}`} role="img" aria-label="Revenue over time">
        {points.map((d, i) => {
          const barH = Math.max((d.value / max) * chartH, 2);
          const x = 12 + i * (barW + gap);
          const y = chartH - barH;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" fill="url(#barGrad)" />
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">
                {d.date.slice(5)}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FD1F0" />
            <stop offset="100%" stopColor="#2E86DE" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [charts, setCharts] = useState<DashboardChartsDto | null>(null);
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<DashboardMetricsDto>('/admin/analytics/dashboard'),
      apiGet<DashboardChartsDto>('/admin/analytics/charts?days=30'),
      apiGet<Paginated<TicketDto>>('/admin/tickets?page=1&pageSize=6').catch(() => ({ items: [] as TicketDto[] })),
    ])
      .then(([nextMetrics, nextCharts, ticketPage]) => {
        if (cancelled) return;
        setMetrics(nextMetrics);
        setCharts(nextCharts);
        setTickets(readItems(ticketPage));
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>;
  }

  if (!metrics) {
    return <p className="text-sm text-slate-400">Loading live operations…</p>;
  }

  const cards = [
    { label: 'Active customers', value: metrics.activeCustomers.toLocaleString('en-PK'), hint: `${metrics.totalCustomers} total`, color: '#2E86DE' },
    { label: 'Monthly revenue', value: money(metrics.monthlyRevenue, metrics.currency), hint: `${metrics.paidInvoices} invoices paid`, color: '#6C63FF' },
    { label: 'Outstanding', value: money(metrics.outstandingAmount, metrics.currency), hint: `${metrics.outstandingInvoices} open invoices`, color: '#F59E0B' },
    { label: 'Open tickets', value: String(metrics.openTickets), hint: `${metrics.resolvedTickets} resolved this month`, color: '#D97706' },
    { label: 'Pending applications', value: String(metrics.pendingApplications), hint: `${metrics.newApplications} new this month`, color: '#7FD1F0' },
    { label: 'Active subscriptions', value: String(metrics.activeSubscriptions), hint: 'Live lines on the network', color: '#2E86DE' },
    { label: 'Waitlist', value: String(metrics.waitlistCount), hint: `${metrics.newLeads} new leads`, color: '#7FD1F0' },
    { label: 'New leads', value: String(metrics.newLeads), hint: 'Coverage interest this month', color: '#6C63FF' },
  ];

  const fiberCovered = charts?.coverageOutcomes.find((row) => /SERVICEABLE|AVAILABLE|COVERED/i.test(row.label));
  const fiberTotal = charts?.coverageOutcomes.reduce((sum, row) => sum + row.value, 0) ?? 0;
  const fiberPct = fiberTotal ? Math.round(((fiberCovered?.value ?? 0) / fiberTotal) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Live figures from the API — nothing here is invented.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/8 bg-[#0d1e38] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{kpi.label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-white">{kpi.value}</p>
            <p className="mt-1 text-xs" style={{ color: kpi.color }}>{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-white/8 bg-[#0d1e38] p-6">
          <p className="font-display font-bold text-white">Revenue (30 days)</p>
          <p className="mt-0.5 text-xs text-slate-400">Succeeded payments, grouped by day</p>
          <div className="mt-4">
            <BarChart series={charts?.revenue ?? []} />
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0d1e38] p-6">
          <p className="font-display font-bold text-white">Fibre checks</p>
          <p className="mt-6 text-center font-display text-5xl font-extrabold text-[#7FD1F0]">{fiberPct}%</p>
          <p className="mt-2 text-center text-xs text-slate-400">
            {fiberCovered?.value ?? 0} serviceable of {fiberTotal} coverage checks
          </p>
          <div className="mt-5 h-2 rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2E86DE] to-[#7FD1F0]" style={{ width: `${fiberPct}%` }} />
          </div>
        </div>
      </div>

      {charts?.popularPlans?.length ? (
        <div className="rounded-2xl border border-white/8 bg-[#0d1e38] p-6">
          <p className="font-display font-bold text-white">Popular plans</p>
          <p className="mt-0.5 text-xs text-slate-400">Active subscriptions grouped by catalogue plan</p>
          <ul className="mt-4 space-y-3">
            {charts.popularPlans.map((plan) => (
              <li key={plan.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-200">{plan.label}</span>
                <span className="font-semibold text-[#7FD1F0]">{plan.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1e38]">
        <div className="flex items-center justify-between px-6 py-5">
          <p className="font-display font-bold text-white">Open tickets</p>
          <Link href={adminRoutes.tickets} className="text-xs font-bold text-[#7FD1F0]">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-white/6 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No tickets yet.</td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-6 py-3 font-semibold text-white">{ticket.subject}</td>
                    <td className="px-6 py-3 text-slate-400">{ticket.priority}</td>
                    <td className="px-6 py-3 text-slate-300">{ticket.status}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">{new Date(ticket.createdAt).toLocaleString('en-PK')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
