'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { FaqCategoryDto, FaqDto, Paginated } from '@stormfiber/types';
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

export default function AdminFaqsPage() {
  const [rows, setRows] = useState<FaqDto[]>([]);
  const [categories, setCategories] = useState<FaqCategoryDto[]>([]);
  const [editing, setEditing] = useState<FaqDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<Paginated<FaqDto>>('/admin/faqs?pageSize=50')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load FAQs'));
    apiGet<FaqCategoryDto[]>('/admin/faqs/categories').then(setCategories).catch(() => setCategories([]));
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
        question: String(form.get('question') ?? ''),
        slug: String(form.get('slug') ?? ''),
        answer: String(form.get('answer') ?? ''),
        categoryId: String(form.get('categoryId') ?? '') || undefined,
        status: String(form.get('status') ?? 'PUBLISHED'),
        tags: String(form.get('tags') ?? '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      await apiSend<FaqDto>(editing ? `/admin/faqs/${editing.id}` : '/admin/faqs', payload, {
        method: editing ? 'PATCH' : 'POST',
      });
      setMessage(editing ? 'FAQ updated' : 'FAQ created');
      setEditing(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save FAQ');
    }
  }

  async function onCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<FaqCategoryDto>('/admin/faqs/categories', {
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        description: String(form.get('description') ?? '') || undefined,
      });
      setMessage('Category created');
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save category');
    }
  }

  async function archive(row: FaqDto) {
    if (!window.confirm(`Archive “${row.question}”?`)) return;
    setError(null);
    try {
      await apiDelete(`/admin/faqs/${row.id}`);
      setMessage('FAQ archived');
      if (editing?.id === row.id) setEditing(null);
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not archive FAQ');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">FAQs</h1>
      <p className="mt-2 text-sm text-slate-400">Published answers appear on /faqs and Help Center.</p>
      <FormError message={error} />
      <FormSuccess message={message} />
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Question</th>
            <th>Category</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">{row.question}</td>
              <td>{row.categoryName ?? '—'}</td>
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
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form key={editing?.id ?? 'new'} onSubmit={onSubmit} className="space-y-3">
          <h2 className="font-semibold">{editing ? 'Edit FAQ' : 'Create FAQ'}</h2>
          <Field label="Question">
            <TextInput name="question" required defaultValue={editing?.question} />
          </Field>
          <Field label="Slug">
            <TextInput name="slug" required defaultValue={editing?.slug} />
          </Field>
          <Field label="Answer">
            <TextArea name="answer" required defaultValue={editing?.answer} />
          </Field>
          <Field label="Category">
            <SelectInput name="categoryId" defaultValue={editing?.categoryId ?? ''}>
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Tags (comma separated)">
            <TextInput name="tags" defaultValue={editing?.tags.join(', ')} />
          </Field>
          <Field label="Status">
            <SelectInput name="status" defaultValue={editing?.status ?? 'PUBLISHED'}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </SelectInput>
          </Field>
          <div className="flex gap-3">
            <button type="submit" className={primaryBtn}>
              {editing ? 'Update FAQ' : 'Create FAQ'}
            </button>
            {editing ? (
              <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <form onSubmit={onCategory} className="space-y-3">
          <h2 className="font-semibold">New category</h2>
          <Field label="Name">
            <TextInput name="name" required />
          </Field>
          <Field label="Slug">
            <TextInput name="slug" required />
          </Field>
          <Field label="Description">
            <TextArea name="description" />
          </Field>
          <button type="submit" className={primaryBtn}>
            Create category
          </button>
        </form>
      </div>
    </div>
  );
}
