'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { PromotionDto } from '@stormfiber/types';
import {
  Field,
  FormError,
  FormSuccess,
  SelectInput,
  TextArea,
  TextInput,
  ghostBtn,
  primaryBtn,
} from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminOffersPage() {
  const [rows, setRows] = useState<PromotionDto[]>([]);
  const [editing, setEditing] = useState<PromotionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<PromotionDto[]>('/admin/promotions')
      .then(setRows)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load offers'));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const payload = {
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        description: String(form.get('description') ?? '') || undefined,
        discountKind: String(form.get('discountKind') ?? 'PERCENTAGE'),
        discountValue: Number(form.get('discountValue') ?? 0),
        durationMonths: Number(form.get('durationMonths') || 0) || undefined,
        badgeText: String(form.get('badgeText') ?? '') || undefined,
        code: String(form.get('code') ?? '') || undefined,
        status: String(form.get('status') ?? 'DRAFT'),
        imageUrl: String(form.get('imageUrl') ?? '') || undefined,
      };
      await apiSend<PromotionDto>(
        editing ? `/admin/promotions/${editing.id}` : '/admin/promotions',
        payload,
        { method: editing ? 'PATCH' : 'POST' },
      );
      setMessage(editing ? 'Offer updated' : 'Offer created');
      setEditing(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save promotion');
    }
  }

  async function setStatus(row: PromotionDto, status: string) {
    setError(null);
    try {
      await apiSend<PromotionDto>(
        `/admin/promotions/${row.id}`,
        {
          name: row.name,
          slug: row.slug,
          description: row.description ?? undefined,
          discountKind: row.discountKind,
          discountValue: row.discountValue,
          durationMonths: row.durationMonths ?? undefined,
          badgeText: row.badgeText ?? undefined,
          status,
          imageUrl: row.imageUrl ?? undefined,
        },
        { method: 'PATCH' },
      );
      setMessage(status === 'ARCHIVED' ? 'Offer archived' : 'Offer updated');
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update offer');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Offers</h1>
      <p className="mt-2 text-sm text-slate-400">Published offers appear on /offers for customers.</p>
      <FormError message={error} />
      <FormSuccess message={message} />
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Name</th>
            <th>Discount</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">{row.name}</td>
              <td>
                {row.discountKind} {row.discountValue}
              </td>
              <td>{row.status}</td>
              <td className="text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setEditing(row)}>
                    Edit
                  </button>
                  {row.status === 'PUBLISHED' ? (
                    <button type="button" className={ghostBtn} onClick={() => setStatus(row, 'DRAFT')}>
                      Unpublish
                    </button>
                  ) : (
                    <button type="button" className={ghostBtn} onClick={() => setStatus(row, 'PUBLISHED')}>
                      Publish
                    </button>
                  )}
                  <button type="button" className={ghostBtn} onClick={() => setStatus(row, 'ARCHIVED')}>
                    Archive
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form key={editing?.id ?? 'new'} onSubmit={onSubmit} className="mt-8 max-w-xl space-y-3">
        <h2 className="font-semibold">{editing ? `Edit ${editing.name}` : 'Create offer'}</h2>
        <Field label="Name">
          <TextInput name="name" required defaultValue={editing?.name} />
        </Field>
        <Field label="Slug">
          <TextInput name="slug" required defaultValue={editing?.slug} />
        </Field>
        <Field label="Description">
          <TextArea name="description" defaultValue={editing?.description ?? ''} />
        </Field>
        <Field label="Discount kind">
          <SelectInput name="discountKind" defaultValue={editing?.discountKind ?? 'PERCENTAGE'}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </SelectInput>
        </Field>
        <Field label="Discount value">
          <TextInput name="discountValue" type="number" required defaultValue={editing?.discountValue ?? 0} />
        </Field>
        <Field label="Duration (months)">
          <TextInput name="durationMonths" type="number" defaultValue={editing?.durationMonths ?? ''} />
        </Field>
        <Field label="Badge">
          <TextInput name="badgeText" defaultValue={editing?.badgeText ?? ''} />
        </Field>
        <Field label="Promo code">
          <TextInput name="code" />
        </Field>
        <Field label="Image URL">
          <TextInput name="imageUrl" defaultValue={editing?.imageUrl ?? ''} />
        </Field>
        <Field label="Status">
          <SelectInput name="status" defaultValue={editing?.status ?? 'DRAFT'}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </SelectInput>
        </Field>
        <div className="flex gap-3">
          <button type="submit" className={primaryBtn}>
            {editing ? 'Update offer' : 'Create offer'}
          </button>
          {editing ? (
            <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
