'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { AdminUserDto, Paginated } from '@stormfiber/types';
import {
  Field,
  FormError,
  FormSuccess,
  SelectInput,
  TextInput,
  ghostBtn,
  primaryBtn,
} from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { apiGet, apiSend, readItems } from '@/lib/api';

const ROLES = ['ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'FINANCE_AGENT'] as const;

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserDto[]>([]);
  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<Paginated<AdminUserDto>>('/admin/users?pageSize=40')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load users'));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<AdminUserDto>('/admin/users', {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        email: String(form.get('email') ?? ''),
        mobile: String(form.get('mobile') ?? ''),
        password: String(form.get('password') ?? ''),
        roles: [String(form.get('role') ?? 'SUPPORT_AGENT')],
      });
      setMessage('Staff account created');
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create user');
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<AdminUserDto>(
        `/admin/users/${editing.id}`,
        {
          firstName: String(form.get('firstName') ?? ''),
          lastName: String(form.get('lastName') ?? ''),
          mobile: String(form.get('mobile') ?? ''),
          status: String(form.get('status') ?? editing.status),
          roles: [String(form.get('role') ?? editing.roles[0] ?? 'SUPPORT_AGENT')],
        },
        { method: 'PATCH' },
      );
      setMessage('Staff account updated');
      setEditing(null);
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update user');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Staff users</h1>
      <FormError message={error} />
      <FormSuccess message={message} />
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">{row.fullName}</td>
              <td>{row.email}</td>
              <td>{row.roles.join(', ')}</td>
              <td>{row.status}</td>
              <td className="text-right">
                <button type="button" className={ghostBtn} onClick={() => setEditing(row)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form onSubmit={onCreate} className="space-y-3">
          <h2 className="font-semibold">Create staff user</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <TextInput name="firstName" required />
            </Field>
            <Field label="Last name">
              <TextInput name="lastName" required />
            </Field>
          </div>
          <Field label="Email">
            <TextInput name="email" type="email" required />
          </Field>
          <Field label="Mobile">
            <TextInput name="mobile" required />
          </Field>
          <Field label="Password">
            <PasswordInput name="password" required autoComplete="new-password" />
          </Field>
          <Field label="Role">
            <SelectInput name="role">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </SelectInput>
          </Field>
          <button type="submit" className={primaryBtn}>
            Create staff user
          </button>
        </form>
        {editing ? (
          <form key={editing.id} onSubmit={onUpdate} className="space-y-3">
            <h2 className="font-semibold">Edit {editing.fullName}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <TextInput name="firstName" required defaultValue={editing.firstName} />
              </Field>
              <Field label="Last name">
                <TextInput name="lastName" required defaultValue={editing.lastName} />
              </Field>
            </div>
            <Field label="Mobile">
              <TextInput name="mobile" required defaultValue={editing.mobile} />
            </Field>
            <Field label="Role">
              <SelectInput name="role" defaultValue={editing.roles.find((role) => role !== 'SUPER_ADMIN') ?? editing.roles[0]}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput name="status" defaultValue={editing.status}>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DISABLED">Disabled</option>
              </SelectInput>
            </Field>
            <div className="flex gap-3">
              <button type="submit" className={primaryBtn}>
                Update user
              </button>
              <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
