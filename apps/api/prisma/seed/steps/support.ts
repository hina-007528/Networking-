import { type PrismaClient, PublishStatus } from '@prisma/client';
import { seedFaqCategories, seedFaqs, seedSupportCategories } from '../data/support';
import { logStep } from '../utils';

export interface SeededSupport {
  supportCategoryIdBySlug: Map<string, string>;
}

export async function seedSupport(prisma: PrismaClient): Promise<SeededSupport> {
  logStep('faq categories');
  const faqCategoryIdBySlug = new Map<string, string>();
  for (const category of seedFaqCategories) {
    const record = await prisma.faqCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        iconKey: category.iconKey,
        displayOrder: category.displayOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        iconKey: category.iconKey,
        displayOrder: category.displayOrder,
      },
    });
    faqCategoryIdBySlug.set(category.slug, record.id);
  }

  logStep('faqs');
  for (const faq of seedFaqs) {
    await prisma.faq.upsert({
      where: { slug: faq.slug },
      update: {
        question: faq.question,
        answer: faq.answer,
        categoryId: faqCategoryIdBySlug.get(faq.categorySlug) ?? null,
        tags: faq.tags,
        status: PublishStatus.PUBLISHED,
        displayOrder: faq.displayOrder,
      },
      create: {
        question: faq.question,
        slug: faq.slug,
        answer: faq.answer,
        categoryId: faqCategoryIdBySlug.get(faq.categorySlug) ?? null,
        tags: faq.tags,
        status: PublishStatus.PUBLISHED,
        displayOrder: faq.displayOrder,
      },
    });
  }

  logStep('support categories');
  const supportCategoryIdBySlug = new Map<string, string>();
  for (const category of seedSupportCategories) {
    const record = await prisma.supportCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        iconKey: category.iconKey,
        displayOrder: category.displayOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        iconKey: category.iconKey,
        displayOrder: category.displayOrder,
        isActive: true,
      },
    });
    supportCategoryIdBySlug.set(category.slug, record.id);
  }

  logStep(`${seedFaqs.length} FAQs across ${seedFaqCategories.length} categories`);

  return { supportCategoryIdBySlug };
}
