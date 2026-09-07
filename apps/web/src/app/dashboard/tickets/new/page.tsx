'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardRoutes } from '@stormfiber/config';
import type { SupportCategoryDto, TicketDto } from '@stormfiber/types';
import { createTicketSchema } from '@stormfiber/validation';
import { SectionHeading } from '@stormfiber/ui';
import { Field, FormError, SelectInput, TextArea, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function NewTicketPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<SupportCategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<SupportCategoryDto[]>('/tickets/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = createTicketSchema.safeParse({
      categoryId: String(form.get('categoryId') ?? ''),
      subject: String(form.get('subject') ?? ''),
      description: String(form.get('description') ?? ''),
      priority: String(form.get('priority') ?? 'MEDIUM'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the ticket form');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await apiSend<TicketDto>('/tickets', parsed.data);
      router.push(dashboardRoutes.ticketDetail(created.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the ticket');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeading heading="Open a ticket" subheading="The ticket is stored against your customer record, not a mailto link." />
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
        <Field label="Category">
          <SelectInput name="categoryId" required>
            <option value="">Select</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Subject">
          <TextInput name="subject" required minLength={5} />
        </Field>
        <Field label="Description">
          <TextArea name="description" required minLength={10} rows={5} />
        </Field>
        <Field label="Priority">
          <SelectInput name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </SelectInput>
        </Field>
        <FormError message={error} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-surge-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
}
