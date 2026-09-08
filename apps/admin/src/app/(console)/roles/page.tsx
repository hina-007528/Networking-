'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { PermissionDto, RoleDto } from '@stormfiber/types';
import { FormError, FormSuccess } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [selected, setSelected] = useState<RoleDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<RoleDto[]>('/admin/roles').then(setRoles).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Could not load roles');
    });
    apiGet<PermissionDto[]>('/admin/permissions').then(setPermissions).catch(() => setPermissions([]));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const keys = permissions.filter((permission) => form.get(permission.key) === 'on').map((permission) => permission.key);
    setError(null);
    try {
      const updated = await apiSend<RoleDto>(`/admin/roles/${selected.id}`, { permissions: keys }, { method: 'PATCH' });
      setSelected(updated);
      setMessage('Permissions updated');
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update role');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Roles</h1>
      <FormError message={error} />
      <FormSuccess message={message} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <ul className="space-y-2 text-sm">
          {roles.map((role) => (
            <li key={role.id}>
              <button type="button" className="text-cyan-300" onClick={() => setSelected(role)}>
                {role.label}
              </button>
              <span className="text-slate-400"> · {role.userCount}</span>
            </li>
          ))}
        </ul>
        {selected ? (
          <form key={selected.id} onSubmit={onSubmit}>
            <h2 className="font-semibold">{selected.label}</h2>
            <p className="mt-1 text-sm text-slate-400">{selected.description}</p>
            {selected.name === 'SUPER_ADMIN' ? (
              <p className="mt-4 text-sm text-slate-400">Super admin always holds every permission.</p>
            ) : (
              <>
                <div className="mt-4 columns-1 gap-3 sm:columns-2">
                  {permissions.map((permission) => (
                    <label key={permission.key} className="mb-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" name={permission.key} defaultChecked={selected.permissions.includes(permission.key)} />
                      {permission.label}
                    </label>
                  ))}
                </div>
                <button type="submit" className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
                  Save permissions
                </button>
              </>
            )}
          </form>
        ) : (
          <p className="text-sm text-slate-400">Select a role.</p>
        )}
      </div>
    </div>
  );
}
