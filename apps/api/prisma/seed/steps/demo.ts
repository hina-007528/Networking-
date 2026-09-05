import {
  ApplicationStatus,
  CallbackStatus,
  CoverageStatus,
  CustomerStatus,
  InvoiceItemType,
  InvoiceStatus,
  LeadStatus,
  NotificationChannel,
  NotificationStatus,
  PaymentMethod,
  PaymentStatus,
  PreferredTime,
  type PrismaClient,
  RoleName,
  ServiceType,
  SubscriptionChangeType,
  SubscriptionStatus,
  TicketAuthorType,
  TicketPriority,
  TicketStatus,
  UserStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { SeededStaff } from './rbac';
import { decimal, endOfMonth, logStep, requireEnv, startOfMonth } from '../utils';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);
const GST_RATE = 19.5;

interface DemoContext {
  cityIdBySlug: Map<string, string>;
  areaIdByKey: Map<string, string>;
  subAreaIdByKey: Map<string, string>;
  planIdBySlug: Map<string, string>;
  addonIdBySlug: Map<string, string>;
  supportCategoryIdBySlug: Map<string, string>;
  staff: SeededStaff;
}

function taxOn(amount: number): number {
  return Math.round(amount * (GST_RATE / 100) * 100) / 100;
}

/**
 * Builds a complete, self-consistent demo account: a verified user, an approved application, an
 * active subscription with add-ons, three invoices in different states with matching payments, two
 * support tickets, notifications, plus coverage checks, leads and callback requests so the admin
 * dashboards and analytics charts have data on first run.
 */
export async function seedDemoData(prisma: PrismaClient, context: DemoContext): Promise<void> {
  const karachiId = context.cityIdBySlug.get('karachi');
  const lahoreId = context.cityIdBySlug.get('lahore');
  const islamabadId = context.cityIdBySlug.get('islamabad');
  const dhaPhase6Id = context.areaIdByKey.get('karachi/d-h-a-phase-6');
  const bukhariId = context.subAreaIdByKey.get('karachi/d-h-a-phase-6/khayaban-e-bukhari');
  const gulbergId = context.areaIdByKey.get('lahore/gulberg-iii');
  const scheme33Id = context.areaIdByKey.get('karachi/scheme-33');
  const planId = context.planIdBySlug.get('squall-50-trio');
  const upgradePlanId = context.planIdBySlug.get('tempest-100-trio');
  const hdBoxAddonId = context.addonIdBySlug.get('additional-hd-box');
  const billingCategoryId = context.supportCategoryIdBySlug.get('billing');
  const internetCategoryId = context.supportCategoryIdBySlug.get('internet');

  if (!karachiId || !lahoreId || !islamabadId || !dhaPhase6Id || !planId || !upgradePlanId) {
    throw new Error('Demo seed requires the geography and catalog steps to have run first.');
  }

  /* ------------------------------- customer -------------------------------- */

  logStep('demo customer');
  const customerEmail = requireEnv('SEED_CUSTOMER_EMAIL');
  const customerMobile = requireEnv('SEED_CUSTOMER_MOBILE', '03001234567');
  const passwordHash = await bcrypt.hash(requireEnv('SEED_CUSTOMER_PASSWORD'), ROUNDS);
  const now = new Date();

  const customerUser = await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      mobile: customerMobile,
      firstName: 'Ayesha',
      lastName: 'Khan',
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      mobileVerifiedAt: now,
    },
    create: {
      email: customerEmail,
      mobile: customerMobile,
      firstName: 'Ayesha',
      lastName: 'Khan',
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      mobileVerifiedAt: now,
    },
  });

  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.CUSTOMER } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customerUser.id, roleId: customerRole.id } },
    update: {},
    create: { userId: customerUser.id, roleId: customerRole.id },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {
      status: CustomerStatus.ACTIVE,
      cityId: karachiId,
      areaId: dhaPhase6Id,
      subAreaId: bukhariId ?? null,
      addressLine: 'House 21, Khayaban-e-Bukhari, D.H.A. Phase 6, Karachi',
    },
    create: {
      userId: customerUser.id,
      accountNumber: 'SF-100001',
      firstName: 'Ayesha',
      lastName: 'Khan',
      email: customerEmail,
      mobile: customerMobile,
      status: CustomerStatus.ACTIVE,
      cityId: karachiId,
      areaId: dhaPhase6Id,
      subAreaId: bukhariId ?? null,
      addressLine: 'House 21, Khayaban-e-Bukhari, D.H.A. Phase 6, Karachi',
      activatedAt: startOfMonth(-3),
    },
  });

  await prisma.customerAddress.deleteMany({ where: { customerId: customer.id } });
  await prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      label: 'Home',
      addressLine: 'House 21, Khayaban-e-Bukhari, D.H.A. Phase 6, Karachi',
      landmark: 'Opposite the community park',
      cityId: karachiId,
      areaId: dhaPhase6Id,
      subAreaId: bukhariId ?? null,
      isPrimary: true,
      isBilling: true,
    },
  });

  /* ------------------------------ application ------------------------------ */

  logStep('demo application with status history');
  const planPrice = await prisma.planPrice.findUnique({
    where: { planId_cityId: { planId, cityId: karachiId } },
  });
  const monthlyBase = Number(planPrice?.monthlyPrice ?? 6999);
  const installationBase = Number(planPrice?.installationPrice ?? 7500);

  const application = await prisma.application.upsert({
    where: { reference: 'APP-2026-0001' },
    update: { status: ApplicationStatus.ACTIVE, customerId: customer.id },
    create: {
      reference: 'APP-2026-0001',
      status: ApplicationStatus.ACTIVE,
      firstName: 'Ayesha',
      lastName: 'Khan',
      email: customerEmail,
      mobile: customerMobile,
      cityId: karachiId,
      areaId: dhaPhase6Id,
      subAreaId: bukhariId ?? null,
      addressLine: 'House 21, Khayaban-e-Bukhari, D.H.A. Phase 6, Karachi',
      nearestLandmark: 'Opposite the community park',
      services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
      planId,
      addonIds: hdBoxAddonId ? [hdBoxAddonId] : [],
      quote: {
        basePrice: monthlyBase,
        addonsTotal: hdBoxAddonId ? 500 : 0,
        discountTotal: 0,
        taxTotal: taxOn(monthlyBase + (hdBoxAddonId ? 500 : 0)),
        installationPrice: installationBase,
        monthlyTotal: monthlyBase + (hdBoxAddonId ? 500 : 0) + taxOn(monthlyBase + 500),
        currency: 'PKR',
      },
      termsAcceptedAt: startOfMonth(-3),
      mobileVerifiedAt: startOfMonth(-3),
      submittedAt: startOfMonth(-3),
      reviewedAt: startOfMonth(-3),
      reviewedById: context.staff.managerId,
      customerId: customer.id,
    },
  });

  await prisma.applicationStatusHistory.deleteMany({ where: { applicationId: application.id } });
  const lifecycle: ApplicationStatus[] = [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PAYMENT_PENDING,
    ApplicationStatus.PAYMENT_RECEIVED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.INSTALLATION_SCHEDULED,
    ApplicationStatus.INSTALLATION_IN_PROGRESS,
    ApplicationStatus.ACTIVE,
  ];
  let previous: ApplicationStatus | null = ApplicationStatus.DRAFT;
  for (const [index, status] of lifecycle.entries()) {
    const at = new Date(startOfMonth(-3).getTime() + index * 6 * 60 * 60 * 1000);
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: previous,
        toStatus: status,
        changedById: context.staff.managerId,
        createdAt: at,
      },
    });
    previous = status;
  }

  /* ------------------------------ subscription ----------------------------- */

  logStep('demo subscription with items and history');
  const subscription = await prisma.subscription.upsert({
    where: { reference: 'SUB-100001' },
    update: { status: SubscriptionStatus.ACTIVE },
    create: {
      reference: 'SUB-100001',
      customerId: customer.id,
      planId,
      applicationId: application.id,
      cityId: karachiId,
      status: SubscriptionStatus.ACTIVE,
      services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
      monthlyAmount: decimal(monthlyBase + 500),
      startedAt: startOfMonth(-3),
      currentPeriodStart: startOfMonth(0),
      currentPeriodEnd: endOfMonth(0),
      nextBillingDate: startOfMonth(1),
    },
  });

  await prisma.subscriptionItem.deleteMany({ where: { subscriptionId: subscription.id } });
  await prisma.subscriptionItem.createMany({
    data: [
      {
        subscriptionId: subscription.id,
        serviceType: ServiceType.INTERNET,
        label: 'Squall 50 Trio — 50 Mbps symmetric internet',
        unitPrice: decimal(monthlyBase),
      },
      {
        subscriptionId: subscription.id,
        serviceType: ServiceType.TV,
        label: 'Squall 50 Trio — 140+ HD channels',
        unitPrice: decimal(0),
      },
      {
        subscriptionId: subscription.id,
        serviceType: ServiceType.PHONE,
        label: 'Squall 50 Trio — voice line with 300 minutes',
        unitPrice: decimal(0),
      },
      ...(hdBoxAddonId
        ? [
            {
              subscriptionId: subscription.id,
              serviceType: ServiceType.TV,
              label: 'Additional HD Box',
              addonId: hdBoxAddonId,
              unitPrice: decimal(500),
            },
          ]
        : []),
    ],
  });

  await prisma.subscriptionHistory.deleteMany({ where: { subscriptionId: subscription.id } });
  await prisma.subscriptionHistory.createMany({
    data: [
      {
        subscriptionId: subscription.id,
        changeType: SubscriptionChangeType.SERVICE_ACTIVATED,
        toValue: 'Squall 50 Trio',
        reason: 'Installation completed and service activated',
        changedById: context.staff.managerId,
        createdAt: startOfMonth(-3),
      },
      {
        subscriptionId: subscription.id,
        changeType: SubscriptionChangeType.ADDON_ADDED,
        toValue: 'Additional HD Box',
        reason: 'Customer requested a second set-top box',
        changedById: context.staff.supportAgentId,
        createdAt: startOfMonth(-1),
      },
    ],
  });

  await prisma.subscriptionChangeRequest.deleteMany({
    where: { subscriptionId: subscription.id },
  });
  await prisma.subscriptionChangeRequest.create({
    data: {
      subscriptionId: subscription.id,
      changeType: SubscriptionChangeType.UPGRADE,
      requestedPlanId: upgradePlanId,
      customerNote: 'We have added two more people working from home and need more upload.',
    },
  });

  /* -------------------------------- invoices ------------------------------- */

  logStep('demo invoices, items and payments');
  await prisma.payment.deleteMany({ where: { customerId: customer.id } });
  await prisma.invoice.deleteMany({ where: { customerId: customer.id } });

  const invoicePlans = [
    { offset: -2, status: InvoiceStatus.PAID, includeInstallation: false },
    { offset: -1, status: InvoiceStatus.OVERDUE, includeInstallation: false },
    { offset: 0, status: InvoiceStatus.PENDING, includeInstallation: false },
  ] as const;

  let outstanding = 0;
  for (const [index, plan] of invoicePlans.entries()) {
    const periodStart = startOfMonth(plan.offset);
    const periodEnd = endOfMonth(plan.offset);
    const dueDate = new Date(
      Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 10),
    );

    const addonAmount = hdBoxAddonId ? 500 : 0;
    const subtotal = monthlyBase + addonAmount;
    const taxTotal = taxOn(subtotal);
    const total = Math.round((subtotal + taxTotal) * 100) / 100;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-${String(1001 + index).padStart(4, '0')}`,
        customerId: customer.id,
        subscriptionId: subscription.id,
        status: plan.status,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        issuedAt: periodStart,
        dueDate,
        subtotal: decimal(subtotal),
        discountTotal: decimal(0),
        taxTotal: decimal(taxTotal),
        total: decimal(total),
        amountPaid: decimal(plan.status === InvoiceStatus.PAID ? total : 0),
        items: {
          create: [
            {
              type: InvoiceItemType.SUBSCRIPTION,
              description: 'Squall 50 Trio — monthly subscription',
              quantity: 1,
              unitPrice: decimal(monthlyBase),
              amount: decimal(monthlyBase),
              taxRate: GST_RATE,
              taxAmount: decimal(taxOn(monthlyBase)),
            },
            ...(addonAmount > 0
              ? [
                  {
                    type: InvoiceItemType.ADDON,
                    description: 'Additional HD Box',
                    quantity: 1,
                    unitPrice: decimal(addonAmount),
                    amount: decimal(addonAmount),
                    taxRate: GST_RATE,
                    taxAmount: decimal(taxOn(addonAmount)),
                  },
                ]
              : []),
          ],
        },
      },
    });

    if (plan.status === InvoiceStatus.PAID) {
      await prisma.payment.create({
        data: {
          reference: `PAY-2026-${String(2001 + index).padStart(4, '0')}`,
          invoiceId: invoice.id,
          customerId: customer.id,
          amount: decimal(total),
          method: PaymentMethod.CARD,
          provider: 'mock',
          status: PaymentStatus.SUCCEEDED,
          instrumentLabel: 'Card ending 4242',
          providerReference: `mock_${invoice.invoiceNumber}`,
          idempotencyKey: `seed-${invoice.invoiceNumber}`,
          paidAt: new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000),
          transactions: {
            create: [
              {
                kind: 'CREATE',
                status: PaymentStatus.INITIATED,
                amount: decimal(total),
                responseSummary: { provider: 'mock', accepted: true },
              },
              {
                kind: 'VERIFY',
                status: PaymentStatus.SUCCEEDED,
                amount: decimal(total),
                responseSummary: { provider: 'mock', verified: true },
              },
            ],
          },
        },
      });
    } else {
      outstanding += total;
    }
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { balance: decimal(outstanding) },
  });

  /* --------------------------------- tickets -------------------------------- */

  logStep('demo tickets with messages and timeline');
  await prisma.ticket.deleteMany({ where: { customerId: customer.id } });

  const resolvedTicket = await prisma.ticket.create({
    data: {
      reference: 'TKT-2026-0001',
      subject: 'Wi-Fi drops in the upstairs bedroom',
      description:
        'The connection is fine in the lounge but keeps dropping upstairs. A wired test on the router gives full speed.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.MEDIUM,
      categoryId: internetCategoryId ?? null,
      customerId: customer.id,
      assignedToId: context.staff.supportAgentId,
      firstResponseAt: startOfMonth(-1),
      resolvedAt: startOfMonth(-1),
      messages: {
        create: [
          {
            body: 'The connection is fine in the lounge but keeps dropping upstairs.',
            authorId: customerUser.id,
            authorName: 'Ayesha Khan',
            authorType: TicketAuthorType.CUSTOMER,
          },
          {
            body: 'Thanks for the wired test result — that tells us the fibre line is healthy and this is a Wi-Fi coverage issue. A mesh node upstairs will fix it; I have added the details to your account.',
            authorId: context.staff.supportAgentId,
            authorName: 'Hamza Support',
            authorType: TicketAuthorType.AGENT,
          },
          {
            body: 'Customer accepted the mesh add-on. Closing after confirmation.',
            authorId: context.staff.supportAgentId,
            authorName: 'Hamza Support',
            authorType: TicketAuthorType.AGENT,
            isInternal: true,
          },
        ],
      },
      statusHistory: {
        create: [
          { toStatus: TicketStatus.OPEN },
          {
            fromStatus: TicketStatus.OPEN,
            toStatus: TicketStatus.IN_PROGRESS,
            changedById: context.staff.supportAgentId,
          },
          {
            fromStatus: TicketStatus.IN_PROGRESS,
            toStatus: TicketStatus.RESOLVED,
            changedById: context.staff.supportAgentId,
            note: 'Coverage issue explained and mesh node offered',
          },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      reference: 'TKT-2026-0002',
      subject: 'Query about the tax lines on my latest invoice',
      description:
        'Could you explain the two tax lines shown on my invoice? I want to understand which rate applies to which charge.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.LOW,
      categoryId: billingCategoryId ?? null,
      customerId: customer.id,
      messages: {
        create: [
          {
            body: 'Could you explain the two tax lines shown on my invoice?',
            authorId: customerUser.id,
            authorName: 'Ayesha Khan',
            authorType: TicketAuthorType.CUSTOMER,
          },
        ],
      },
      statusHistory: { create: [{ toStatus: TicketStatus.OPEN }] },
    },
  });

  /* ----------------------------- notifications ----------------------------- */

  logStep('demo notifications');
  await prisma.notification.deleteMany({ where: { userId: customerUser.id } });
  await prisma.notification.createMany({
    data: [
      {
        userId: customerUser.id,
        event: 'INVOICE_GENERATED',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: 'Your invoice for this month is ready',
        body: 'Invoice INV-2026-1003 has been generated and is payable by the 10th.',
        href: '/dashboard/invoices',
        sentAt: startOfMonth(0),
      },
      {
        userId: customerUser.id,
        event: 'INVOICE_OVERDUE',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: 'An invoice is now overdue',
        body: 'Invoice INV-2026-1002 passed its due date. Please settle it to avoid suspension.',
        href: '/dashboard/billing',
        sentAt: startOfMonth(0),
      },
      {
        userId: customerUser.id,
        event: 'TICKET_RESOLVED',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.READ,
        title: 'Your ticket was resolved',
        body: `Ticket ${resolvedTicket.reference} has been marked resolved.`,
        href: `/dashboard/tickets/${resolvedTicket.id}`,
        sentAt: startOfMonth(-1),
        readAt: startOfMonth(-1),
      },
    ],
  });

  /* --------------------- coverage checks, leads, callbacks ------------------ */

  logStep('coverage checks, leads and callback requests');
  await prisma.coverageLead.deleteMany({});
  await prisma.coverageCheck.deleteMany({});

  const availableCheck = await prisma.coverageCheck.create({
    data: {
      cityId: karachiId,
      areaId: dhaPhase6Id,
      subAreaId: bukhariId ?? null,
      result: CoverageStatus.AVAILABLE,
      address: 'House 21, Khayaban-e-Bukhari',
      createdAt: startOfMonth(-3),
    },
  });

  const comingSoonCheck = scheme33Id
    ? await prisma.coverageCheck.create({
        data: {
          cityId: karachiId,
          areaId: scheme33Id,
          result: CoverageStatus.COMING_SOON,
          address: 'Sector 15-A, Scheme 33',
        },
      })
    : null;

  await prisma.coverageCheck.create({
    data: { cityId: lahoreId, areaId: gulbergId ?? null, result: CoverageStatus.AVAILABLE },
  });

  await prisma.coverageLead.createMany({
    data: [
      ...(comingSoonCheck
        ? [
            {
              checkId: comingSoonCheck.id,
              name: 'Faisal Mahmood',
              mobile: '03211234567',
              email: 'faisal@example.com',
              cityId: karachiId,
              areaId: scheme33Id,
              address: 'Sector 15-A, Scheme 33, Karachi',
              notes: 'Interested as soon as the area goes live.',
              status: LeadStatus.NEW,
              coverageResult: CoverageStatus.COMING_SOON,
            },
          ]
        : []),
      {
        checkId: availableCheck.id,
        name: 'Hina Raza',
        mobile: '03331234567',
        cityId: lahoreId,
        areaId: gulbergId ?? null,
        address: 'Flat 4, Block C, Gulberg III, Lahore',
        status: LeadStatus.CONTACTED,
        coverageResult: CoverageStatus.AVAILABLE,
        assignedToId: context.staff.salesAgentId,
      },
    ],
  });

  await prisma.callbackRequest.deleteMany({});
  await prisma.callbackRequest.createMany({
    data: [
      {
        reference: 'CB-2026-0001',
        name: 'Usman Tariq',
        phone: '03451234567',
        email: 'usman@example.com',
        cityId: islamabadId,
        preferredTime: PreferredTime.EVENING,
        subject: 'Need help choosing between 50 and 100 Mbps',
        message: 'Four people working from home, mostly video calls and cloud backups.',
        status: CallbackStatus.NEW,
      },
      {
        reference: 'CB-2026-0002',
        name: 'Sana Iqbal',
        phone: '03011234567',
        cityId: lahoreId,
        areaId: gulbergId ?? null,
        preferredTime: PreferredTime.MORNING,
        subject: 'Moving home — can I transfer my connection?',
        status: CallbackStatus.IN_PROGRESS,
        assignedToId: context.staff.salesAgentId,
        contactedAt: new Date(),
      },
    ],
  });

  /* ---------------------------- analytics events --------------------------- */

  logStep('analytics events for the admin charts');
  await prisma.analyticsEvent.deleteMany({});
  const events: { name: string; path: string; cityId?: string; planId?: string }[] = [
    { name: 'page_view', path: '/' },
    { name: 'page_view', path: '/plans' },
    { name: 'plan_view', path: '/plans', planId },
    { name: 'plan_compare', path: '/plans/compare' },
    { name: 'coverage_check', path: '/check-availability', cityId: karachiId },
    { name: 'coverage_available', path: '/check-availability', cityId: karachiId },
    { name: 'coverage_unavailable', path: '/check-availability', cityId: lahoreId },
    { name: 'application_started', path: '/get-stormfiber' },
    { name: 'application_submitted', path: '/get-stormfiber', planId },
    { name: 'payment_started', path: '/dashboard/billing' },
    { name: 'payment_success', path: '/dashboard/billing' },
    { name: 'ticket_created', path: '/dashboard/tickets/new' },
    { name: 'callback_requested', path: '/support/contact', cityId: islamabadId },
  ];

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - dayOffset);
    // A gentle pseudo-random spread so the charts are not a flat line.
    const repeats = ((dayOffset * 7) % 5) + 1;
    await prisma.analyticsEvent.createMany({
      data: events.flatMap((event) =>
        Array.from({ length: repeats }, () => ({
          name: event.name,
          path: event.path,
          cityId: event.cityId ?? null,
          planId: event.planId ?? null,
          createdAt,
          properties: {},
        })),
      ),
    });
  }

  logStep(`demo account ready: ${customerEmail} / account ${customer.accountNumber}`);
}
