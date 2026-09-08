'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { CmsPageDto, CmsSectionDto, HeroSlideDto } from '@stormfiber/types';
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
import { apiDelete, apiGet, apiSend } from '@/lib/api';

export default function AdminContentPage() {
  const [slides, setSlides] = useState<HeroSlideDto[]>([]);
  const [pages, setPages] = useState<CmsPageDto[]>([]);
  const [sections, setSections] = useState<CmsSectionDto[]>([]);
  const [slideEdit, setSlideEdit] = useState<HeroSlideDto | null>(null);
  const [pageEdit, setPageEdit] = useState<CmsPageDto | null>(null);
  const [sectionEdit, setSectionEdit] = useState<CmsSectionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<HeroSlideDto[]>('/admin/content/hero-slides').then(setSlides).catch(() => setSlides([]));
    apiGet<CmsPageDto[]>('/admin/content/pages').then(setPages).catch(() => setPages([]));
    apiGet<CmsSectionDto[]>('/admin/content/sections').then(setSections).catch(() => setSections([]));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<HeroSlideDto>(
        slideEdit ? `/admin/content/hero-slides/${slideEdit.id}` : '/admin/content/hero-slides',
        {
          eyebrow: String(form.get('eyebrow') ?? '') || undefined,
          headline: String(form.get('headline') ?? ''),
          headlineAccent: String(form.get('headlineAccent') ?? '') || undefined,
          subheadline: String(form.get('subheadline') ?? '') || undefined,
          desktopImageUrl: String(form.get('desktopImageUrl') ?? '') || undefined,
          imageAlt: String(form.get('imageAlt') ?? 'Promotional slide'),
          primaryCtaLabel: String(form.get('primaryCtaLabel') ?? '') || undefined,
          primaryCtaHref: String(form.get('primaryCtaHref') ?? '') || undefined,
          theme: 'DARK',
          status: String(form.get('status') ?? 'DRAFT'),
          displayOrder: Number(form.get('displayOrder') ?? 0),
        },
        { method: slideEdit ? 'PATCH' : 'POST' },
      );
      setMessage(slideEdit ? 'Slide updated' : 'Slide created');
      setSlideEdit(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save slide');
    }
  }

  async function onPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<CmsPageDto>(
        pageEdit ? `/admin/content/pages/${pageEdit.id}` : '/admin/content/pages',
        {
          slug: String(form.get('slug') ?? ''),
          title: String(form.get('title') ?? ''),
          excerpt: String(form.get('excerpt') ?? '') || undefined,
          body: String(form.get('body') ?? ''),
          status: String(form.get('status') ?? 'DRAFT'),
          seoTitle: String(form.get('seoTitle') ?? '') || undefined,
          seoDescription: String(form.get('seoDescription') ?? '') || undefined,
        },
        { method: pageEdit ? 'PATCH' : 'POST' },
      );
      setMessage(pageEdit ? 'Page updated' : 'Page created');
      setPageEdit(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save page');
    }
  }

  async function onSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<CmsSectionDto>(
        sectionEdit ? `/admin/content/sections/${sectionEdit.id}` : '/admin/content/sections',
        {
          key: String(form.get('key') ?? ''),
          kind: String(form.get('kind') ?? 'RICH_TEXT'),
          heading: String(form.get('heading') ?? '') || undefined,
          headingAccent: String(form.get('headingAccent') ?? '') || undefined,
          subheading: String(form.get('subheading') ?? '') || undefined,
          body: String(form.get('body') ?? '') || undefined,
          ctaLabel: String(form.get('ctaLabel') ?? '') || undefined,
          ctaHref: String(form.get('ctaHref') ?? '') || undefined,
          status: String(form.get('status') ?? 'DRAFT'),
          displayOrder: Number(form.get('displayOrder') ?? 0),
          content: {},
        },
        { method: sectionEdit ? 'PATCH' : 'POST' },
      );
      setMessage(sectionEdit ? 'Section updated' : 'Section created');
      setSectionEdit(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save section');
    }
  }

  async function deleteSlide(slide: HeroSlideDto) {
    if (!window.confirm(`Delete slide “${slide.headline}”?`)) return;
    try {
      await apiDelete(`/admin/content/hero-slides/${slide.id}`);
      setMessage('Slide deleted');
      if (slideEdit?.id === slide.id) setSlideEdit(null);
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete slide');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Content</h1>
      <p className="mt-2 text-sm text-slate-400">Hero slides, legal pages, and homepage sections drive the public site.</p>
      <FormError message={error} />
      <FormSuccess message={message} />
      <div className="mt-8 grid gap-10 xl:grid-cols-3">
        <section>
          <h2 className="font-semibold">Hero slides</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {slides.map((slide) => (
              <li key={slide.id} className="flex items-center justify-between gap-2 border-b border-white/5 py-2">
                <span>
                  {slide.headline} · {slide.status}
                </span>
                <span className="flex gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setSlideEdit(slide)}>
                    Edit
                  </button>
                  <button type="button" className={dangerBtn} onClick={() => deleteSlide(slide)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form key={slideEdit?.id ?? 'slide-new'} onSubmit={onSlide} className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">{slideEdit ? 'Edit slide' : 'Create slide'}</h3>
            <Field label="Eyebrow">
              <TextInput name="eyebrow" defaultValue={slideEdit?.eyebrow ?? ''} />
            </Field>
            <Field label="Headline">
              <TextInput name="headline" required defaultValue={slideEdit?.headline} />
            </Field>
            <Field label="Accent word">
              <TextInput name="headlineAccent" defaultValue={slideEdit?.headlineAccent ?? ''} />
            </Field>
            <Field label="Subheadline">
              <TextInput name="subheadline" defaultValue={slideEdit?.subheadline ?? ''} />
            </Field>
            <Field label="Image URL">
              <TextInput name="desktopImageUrl" defaultValue={slideEdit?.desktopImageUrl ?? ''} placeholder="/hero-freedom.png" />
            </Field>
            <Field label="Image alt">
              <TextInput name="imageAlt" required defaultValue={slideEdit?.imageAlt ?? 'Fibre broadband promotional slide'} />
            </Field>
            <Field label="CTA label">
              <TextInput name="primaryCtaLabel" defaultValue={slideEdit?.primaryCtaLabel ?? ''} />
            </Field>
            <Field label="CTA URL">
              <TextInput name="primaryCtaHref" defaultValue={slideEdit?.primaryCtaHref ?? ''} />
            </Field>
            <Field label="Order">
              <TextInput name="displayOrder" type="number" defaultValue={slideEdit?.displayOrder ?? 0} />
            </Field>
            <Field label="Status">
              <SelectInput name="status" defaultValue={slideEdit?.status ?? 'DRAFT'}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
              </SelectInput>
            </Field>
            <div className="flex gap-3">
              <button type="submit" className={primaryBtn}>
                {slideEdit ? 'Update slide' : 'Create slide'}
              </button>
              {slideEdit ? (
                <button type="button" className={ghostBtn} onClick={() => setSlideEdit(null)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
        <section>
          <h2 className="font-semibold">Pages</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pages.map((page) => (
              <li key={page.id} className="flex items-center justify-between gap-2 border-b border-white/5 py-2">
                <span>
                  {page.title} · /{page.slug} · {page.status}
                </span>
                <button type="button" className={ghostBtn} onClick={() => setPageEdit(page)}>
                  Edit
                </button>
              </li>
            ))}
          </ul>
          <form key={pageEdit?.id ?? 'page-new'} onSubmit={onPage} className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">{pageEdit ? 'Edit page' : 'Create page'}</h3>
            <Field label="Title">
              <TextInput name="title" required defaultValue={pageEdit?.title} />
            </Field>
            <Field label="Slug">
              <TextInput name="slug" required defaultValue={pageEdit?.slug} />
            </Field>
            <Field label="Excerpt">
              <TextInput name="excerpt" defaultValue={pageEdit?.excerpt ?? ''} />
            </Field>
            <Field label="Body">
              <TextArea name="body" defaultValue={pageEdit?.body ?? ''} />
            </Field>
            <Field label="SEO title">
              <TextInput name="seoTitle" defaultValue={pageEdit?.seoTitle ?? ''} />
            </Field>
            <Field label="Status">
              <SelectInput name="status" defaultValue={pageEdit?.status ?? 'DRAFT'}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </SelectInput>
            </Field>
            <div className="flex gap-3">
              <button type="submit" className={primaryBtn}>
                {pageEdit ? 'Update page' : 'Create page'}
              </button>
              {pageEdit ? (
                <button type="button" className={ghostBtn} onClick={() => setPageEdit(null)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
        <section>
          <h2 className="font-semibold">Homepage sections</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sections.map((section) => (
              <li key={section.id} className="flex items-center justify-between gap-2 border-b border-white/5 py-2">
                <span>
                  {section.heading ?? section.key} · {section.status}
                </span>
                <button type="button" className={ghostBtn} onClick={() => setSectionEdit(section)}>
                  Edit
                </button>
              </li>
            ))}
          </ul>
          <form key={sectionEdit?.id ?? 'section-new'} onSubmit={onSection} className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">{sectionEdit ? 'Edit section' : 'Create section'}</h3>
            <Field label="Key">
              <TextInput name="key" required defaultValue={sectionEdit?.key} placeholder="home.benefits" />
            </Field>
            <Field label="Kind">
              <SelectInput name="kind" defaultValue={sectionEdit?.kind ?? 'RICH_TEXT'}>
                <option value="RICH_TEXT">Rich text</option>
                <option value="BENEFITS">Benefits</option>
                <option value="FEATURED_PLANS">Featured plans</option>
                <option value="PRODUCT_TRIO">Product trio</option>
                <option value="CTA">CTA</option>
                <option value="FAQ">FAQ</option>
                <option value="COVERAGE">Coverage</option>
              </SelectInput>
            </Field>
            <Field label="Heading">
              <TextInput name="heading" defaultValue={sectionEdit?.heading ?? ''} />
            </Field>
            <Field label="Accent">
              <TextInput name="headingAccent" defaultValue={sectionEdit?.headingAccent ?? ''} />
            </Field>
            <Field label="Subheading">
              <TextInput name="subheading" defaultValue={sectionEdit?.subheading ?? ''} />
            </Field>
            <Field label="Body">
              <TextArea name="body" defaultValue={sectionEdit?.body ?? ''} />
            </Field>
            <Field label="CTA label">
              <TextInput name="ctaLabel" defaultValue={sectionEdit?.ctaLabel ?? ''} />
            </Field>
            <Field label="CTA URL">
              <TextInput name="ctaHref" defaultValue={sectionEdit?.ctaHref ?? ''} />
            </Field>
            <Field label="Status">
              <SelectInput name="status" defaultValue={sectionEdit?.status ?? 'DRAFT'}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </SelectInput>
            </Field>
            <div className="flex gap-3">
              <button type="submit" className={primaryBtn}>
                {sectionEdit ? 'Update section' : 'Create section'}
              </button>
              {sectionEdit ? (
                <button type="button" className={ghostBtn} onClick={() => setSectionEdit(null)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
