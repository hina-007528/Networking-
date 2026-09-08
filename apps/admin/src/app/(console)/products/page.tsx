'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { Paginated, ProductDto } from '@stormfiber/types';
import {
  Field,
  FormError,
  FormSuccess,
  SelectInput,
  TextArea,
  TextInput,
  dangerBtn,
  ghostBtn,
  primaryBtn,
} from '@/components/form-field';
import { apiDelete, apiGet, apiSend, readItems } from '@/lib/api';

function featuresToText(product: ProductDto | null): string {
  return (product?.features ?? [])
    .map((feature) => `${feature.title} | ${feature.description}`)
    .join('\n');
}

function textToFeatures(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [title, ...rest] = line.split('|');
      return {
        title: title.trim(),
        description: (rest.join('|').trim() || title.trim()),
        displayOrder: index,
      };
    });
}

export default function AdminProductsPage() {
  const [rows, setRows] = useState<ProductDto[]>([]);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reload() {
    apiGet<Paginated<ProductDto>>('/admin/products?pageSize=40')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load products'));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        serviceType: String(form.get('serviceType') ?? 'INTERNET'),
        tagline: String(form.get('tagline') ?? ''),
        description: String(form.get('description') ?? ''),
        heroHeadline: String(form.get('heroHeadline') ?? ''),
        heroSubheadline: String(form.get('heroSubheadline') ?? '') || undefined,
        imageUrl: String(form.get('imageUrl') ?? '') || undefined,
        status: String(form.get('status') ?? 'PUBLISHED'),
        displayOrder: Number(form.get('displayOrder') ?? 0),
        features: textToFeatures(String(form.get('features') ?? '')),
      };
      const saved = await apiSend<ProductDto>(
        editing ? `/admin/products/${editing.id}` : '/admin/products',
        payload,
        { method: editing ? 'PATCH' : 'POST' },
      );
      setMessage(editing ? 'Product updated' : 'Product created');
      setEditing(null);
      event.currentTarget.reset();
      setRows((current) => {
        const next = current.filter((row) => row.id !== saved.id);
        return [saved, ...next];
      });
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save product');
    } finally {
      setLoading(false);
    }
  }

  async function archive(row: ProductDto) {
    if (!window.confirm(`Archive “${row.name}”? It will leave the public catalogue.`)) return;
    setError(null);
    try {
      await apiDelete(`/admin/products/${row.id}`);
      setMessage('Product archived');
      if (editing?.id === row.id) setEditing(null);
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not archive product');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Products</h1>
      <p className="mt-2 text-sm text-slate-400">Published products appear on the customer site immediately after save.</p>
      <FormError message={error} />
      <FormSuccess message={message} />
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Name</th>
            <th>Service</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">{row.name}</td>
              <td>{row.serviceType}</td>
              <td>{row.status ?? 'PUBLISHED'}</td>
              <td className="text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setEditing(row)}>
                    Edit
                  </button>
                  <button type="button" className={dangerBtn} onClick={() => archive(row)}>
                    Archive
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form key={editing?.id ?? 'new'} onSubmit={onSubmit} className="mt-10 max-w-xl space-y-4">
        <h2 className="font-semibold">{editing ? `Edit ${editing.name}` : 'Create product'}</h2>
        <Field label="Name">
          <TextInput name="name" required defaultValue={editing?.name} />
        </Field>
        <Field label="Slug">
          <TextInput name="slug" required defaultValue={editing?.slug} />
        </Field>
        <Field label="Service">
          <SelectInput name="serviceType" defaultValue={editing?.serviceType ?? 'INTERNET'}>
            <option value="INTERNET">Internet</option>
            <option value="TV">TV</option>
            <option value="PHONE">Phone</option>
          </SelectInput>
        </Field>
        <Field label="Tagline">
          <TextInput name="tagline" required defaultValue={editing?.tagline} />
        </Field>
        <Field label="Hero headline">
          <TextInput name="heroHeadline" required defaultValue={editing?.heroHeadline} />
        </Field>
        <Field label="Hero subheadline">
          <TextInput name="heroSubheadline" defaultValue={editing?.heroSubheadline ?? ''} />
        </Field>
        <Field label="Image URL">
          <TextInput name="imageUrl" defaultValue={editing?.imageUrl ?? ''} placeholder="/fiber-optic.png" />
        </Field>
        <Field label="Description">
          <TextArea name="description" required defaultValue={editing?.description} />
        </Field>
        <Field label="Features (one per line: title | description)">
          <TextArea name="features" defaultValue={featuresToText(editing)} />
        </Field>
        <Field label="Status">
          <SelectInput name="status" defaultValue={editing?.status ?? 'PUBLISHED'}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </SelectInput>
        </Field>
        <Field label="Display order">
          <TextInput name="displayOrder" type="number" defaultValue={editing?.displayOrder ?? 0} />
        </Field>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? 'Saving…' : editing ? 'Update product' : 'Create product'}
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
