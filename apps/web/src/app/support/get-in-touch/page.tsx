'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { brand, publicRoutes } from '@stormfiber/config';
import type { CallbackRequestDto } from '@stormfiber/types';
import { callbackRequestSchema } from '@stormfiber/validation';
import { PageHero } from '@/components/page-hero';
import { PublicContact } from '@/components/public-contact';
import { apiSend } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export default function GetInTouchPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = callbackRequestSchema.safeParse({
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? '') || undefined,
      subject: String(form.get('subject') ?? 'Contact form'),
      message: String(form.get('message') ?? '') || undefined,
      preferredTime: String(form.get('preferredTime') ?? '') || undefined,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the form');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const created = await apiSend<CallbackRequestDto>('/callbacks', parsed.data);
      setMessage(`Thank you. We will call you shortly. Reference ${created.reference}.`);
      setStatus('done');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send the request');
      setStatus('error');
    }
  }

  return (
    <>
      <PageHero heading="Visit us or" accent="leave a message" subheading="Head office, helpline, WhatsApp, and a form that reaches the duty desk." image={heroImages.contact} />
      <div className="sf-container grid gap-6 py-12 lg:grid-cols-2">
        <div className="space-y-4">
          <article className="sf-card p-6">
            <h2 className="sf-h3">{brand.offices.head.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">{brand.offices.head.address}</p>
            <iframe
              title="Head office map"
              className="mt-4 h-40 w-full rounded-lg border-0"
              src="https://www.openstreetmap.org/export/embed.html?bbox=74.30%2C31.57%2C74.33%2C31.59&layer=mapnik&marker=31.5805%2C74.3106"
            />
          </article>
          <article className="sf-card p-6">
            <h2 className="sf-h3">{brand.offices.branch.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">{brand.offices.branch.address}</p>
            <iframe
              title="Branch office map"
              className="mt-4 h-40 w-full rounded-lg border-0"
              src="https://www.openstreetmap.org/export/embed.html?bbox=74.32%2C31.53%2C74.35%2C31.55&layer=mapnik&marker=31.5408%2C74.3370"
            />
          </article>
          <article className="sf-card p-6 text-sm text-[#4B5563]">
            <h2 className="sf-h3">Contact</h2>
            <PublicContact className="mt-4" />
            <Link href={publicRoutes.login} className="sf-btn sf-btn-primary mt-5">
              Sign In
            </Link>
          </article>
        </div>

        <form onSubmit={onSubmit} className="sf-card p-6 sm:p-8">
          <h2 className="sf-h3">Contact form</h2>
          <p className="mt-2 text-sm text-[#4B5563]">Share a number we can reach during business hours.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="sf-label" htmlFor="name">
                Full name
              </label>
              <input id="name" name="name" required className="sf-input" />
            </div>
            <div>
              <label className="sf-label" htmlFor="phone">
                Mobile number
              </label>
              <input id="phone" name="phone" required placeholder="03001234567" className="sf-input" />
            </div>
            <div>
              <label className="sf-label" htmlFor="email">
                Email (optional)
              </label>
              <input id="email" name="email" type="email" className="sf-input" />
            </div>
            <div>
              <label className="sf-label" htmlFor="preferredTime">
                Preferred time
              </label>
              <select id="preferredTime" name="preferredTime" className="sf-input">
                <option value="ANYTIME">Any time</option>
                <option value="MORNING">Morning (9 AM - 12 PM)</option>
                <option value="AFTERNOON">Afternoon (12 PM - 5 PM)</option>
                <option value="EVENING">Evening (5 PM - 9 PM)</option>
              </select>
            </div>
            <div>
              <label className="sf-label" htmlFor="message">
                Message
              </label>
              <textarea id="message" name="message" rows={3} className="sf-input" />
            </div>
            {message ? <p className={status === 'error' ? 'text-sm font-semibold text-red-600' : 'text-sm font-semibold text-emerald-700'}>{message}</p> : null}
            <button type="submit" disabled={status === 'loading'} className="sf-btn sf-btn-primary w-full">
              {status === 'loading' ? 'Submitting...' : 'Send message'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
