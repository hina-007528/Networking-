'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminRoutes } from '@stormfiber/config';
import type { CustomerDto, Paginated } from '@stormfiber/types';
import { PasswordInput } from '@/components/password-input';
import { apiDelete, apiGet, apiSend, readItems } from '@/lib/api';

const statusStyle: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400',
  SUSPENDED: 'bg-red-500/15 text-red-400',
  PROSPECT: 'bg-amber-500/15 text-amber-400',
  PENDING: 'bg-amber-500/15 text-amber-400',
  TERMINATED: 'bg-slate-500/15 text-slate-400',
  CHURNED: 'bg-slate-500/15 text-slate-400',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<CustomerDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    apiGet<Paginated<CustomerDto> | CustomerDto[]>(`/admin/customers?${params}`)
      .then((payload) => {
        if (!cancelled) setCustomers(readItems(payload));
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load customers');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status]);

  const counts = useMemo(
    () => ({
      ACTIVE: customers.filter((c) => c.status === 'ACTIVE').length,
      PROSPECT: customers.filter((c) => c.status === 'PROSPECT').length,
      SUSPENDED: customers.filter((c) => c.status === 'SUSPENDED').length,
      CHURNED: customers.filter((c) => c.status === 'CHURNED').length,
    }),
    [customers],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">Customers</h1>
          <p className="mt-1 text-sm text-slate-400">{loading ? 'Loading…' : `${customers.length} records from the database`}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="min-h-11 rounded-xl bg-[#2E86DE] px-4 text-sm font-bold text-white"
          >
            {showCreate ? 'Close form' : 'Add customer'}
          </button>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, mobile…"
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-slate-500"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROSPECT">Prospect</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CHURNED">Churned</option>
          </select>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {message ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

      {showCreate ? (
        <form
          className="grid gap-3 rounded-2xl border border-white/10 bg-[#0d1e38] p-5 sm:grid-cols-2"
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setCreating(true);
            setError(null);
            try {
              const created = await apiSend<CustomerDto>('/admin/customers', {
                firstName: String(form.get('firstName') ?? ''),
                lastName: String(form.get('lastName') ?? ''),
                email: String(form.get('email') ?? ''),
                mobile: String(form.get('mobile') ?? ''),
                password: String(form.get('password') ?? ''),
                addressLine: String(form.get('addressLine') ?? ''),
                status: String(form.get('status') ?? 'PROSPECT'),
              });
              setCustomers((current) => [created, ...current]);
              setMessage(`Created ${created.fullName} in Lahore`);
              setShowCreate(false);
              event.currentTarget.reset();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Could not create customer');
            } finally {
              setCreating(false);
            }
          }}
        >
          <input name="firstName" required placeholder="First name" className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="lastName" required placeholder="Last name" className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="email" type="email" required placeholder="Email" className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="mobile" required placeholder="03XXXXXXXXX" className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <PasswordInput name="password" required placeholder="Password" autoComplete="new-password" className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <select name="status" className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300">
            <option value="PROSPECT">Pending</option>
            <option value="ACTIVE">Active</option>
          </select>
          <input name="addressLine" required placeholder="Lahore installation address" className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white sm:col-span-2" />
          <button type="submit" disabled={creating} className="min-h-11 rounded-xl bg-[#2E86DE] px-4 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2">
            {creating ? 'Creating…' : 'Create Lahore customer'}
          </button>
        </form>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="rounded-xl border border-white/8 bg-[#0d1e38] px-5 py-4">
            <p className="text-2xl font-extrabold text-white">{count}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1e38]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-white/8">
              <tr>
                {['Customer', 'Account', 'Mobile', 'City', 'Joined', 'Status', ''].map((heading) => (
                  <th key={heading} className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {customers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    No customers yet. A signup on the website creates a prospect here.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/3">
                    <td className="px-5 py-4">
                      <button type="button" className="flex items-center gap-3 text-left" onClick={() => setSelected(customer)}>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2E86DE] to-[#7FD1F0] text-xs font-bold text-white">
                          {customer.fullName.slice(0, 1)}
                        </span>
                        <span>
                          <span className="block font-semibold text-white">{customer.fullName}</span>
                          <span className="block text-xs text-slate-500">{customer.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{customer.accountNumber}</td>
                    <td className="px-5 py-4 text-slate-400">{customer.mobile}</td>
                    <td className="px-5 py-4 text-slate-300">{customer.cityName}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(customer.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusStyle[customer.status] ?? 'bg-slate-500/15 text-slate-400'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <Link href={`${adminRoutes.customers}/${customer.id}`} className="text-xs font-bold text-[#2E86DE]">
                          Open
                        </Link>
                        <button
                          type="button"
                          className="text-xs font-bold text-red-400"
                          onClick={async () => {
                            if (!window.confirm(`Delete ${customer.fullName} and their login?`)) return;
                            try {
                              await apiDelete(`/admin/customers/${customer.id}`);
                              setCustomers((current) => current.filter((row) => row.id !== customer.id));
                              if (selected?.id === customer.id) setSelected(null);
                              setMessage(`${customer.fullName} deleted`);
                            } catch (caught) {
                              setError(caught instanceof Error ? caught.message : 'Could not delete customer');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#081628] p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-xl font-extrabold text-white">{selected.fullName}</p>
              <p className="mt-1 text-sm text-slate-400">{selected.accountNumber}</p>
            </div>
            <button type="button" className="text-slate-400" onClick={() => setSelected(null)} aria-label="Close profile">
              ×
            </button>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div><dt className="text-slate-500">Email</dt><dd className="text-white">{selected.email}</dd></div>
            <div><dt className="text-slate-500">Mobile</dt><dd className="text-white">{selected.mobile}</dd></div>
            <div><dt className="text-slate-500">City</dt><dd className="text-white">{selected.cityName}</dd></div>
            <div><dt className="text-slate-500">Address</dt><dd className="text-white">{selected.addressLine || '—'}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="text-white">{selected.status}</dd></div>
            <div><dt className="text-slate-500">Balance</dt><dd className="text-white">Rs {selected.balance.toLocaleString('en-PK')}</dd></div>
          </dl>
          <Link
            href={`${adminRoutes.customers}/${selected.id}`}
            className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2E86DE] text-sm font-bold text-white"
          >
            Full profile
          </Link>
        </aside>
      ) : null}
    </div>
  );
}
