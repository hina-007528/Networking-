import { CmsSectionKind, PublishStatus, SlideTheme } from '@prisma/client';

/**
 * CMS content.
 *
 * Everything the homepage renders comes from here rather than from JSX, which is what makes the
 * site editable by an operator without a deployment. Images are referenced by path so they can be
 * replaced with assets the operator owns; no third-party artwork is bundled.
 */

export const seedHeroSlides = [
  {
    eyebrow: '100% fibre to the home',
    headline: 'Storm into the',
    headlineAccent: 'future',
    subheadline:
      'Symmetric fibre internet, high-definition television and a landline that never drops — all on one line.',
    desktopImageUrl: '/hero-freedom.png',
    mobileImageUrl: '/hero-freedom.png',
    imageAlt: 'Abstract illustration of a fibre-optic network fanning out across a city',
    primaryCtaLabel: 'Check availability',
    primaryCtaHref: '/check-availability',
    secondaryCtaLabel: 'See plans',
    secondaryCtaHref: '/plans',
    theme: SlideTheme.DARK,
    status: PublishStatus.PUBLISHED,
    displayOrder: 1,
  },
  {
    eyebrow: 'Symmetric speeds',
    headline: 'Upload as fast as you',
    headlineAccent: 'download',
    subheadline:
      'Every plan is symmetric, from 20 to 275 Mbps. Cloud backups and video calls stop being a compromise.',
    desktopImageUrl: '/hero-speed.png',
    mobileImageUrl: '/hero-speed.png',
    imageAlt: 'Illustration of matched upload and download speed indicators',
    primaryCtaLabel: 'Compare plans',
    primaryCtaHref: '/plans',
    secondaryCtaLabel: 'How our network works',
    secondaryCtaHref: '/products/internet',
    theme: SlideTheme.DARK,
    status: PublishStatus.PUBLISHED,
    displayOrder: 2,
  },
  {
    eyebrow: 'Limited time',
    headline: 'Monsoon Surge:',
    headlineAccent: '20% off',
    subheadline:
      'Twenty percent off your first three months on selected 50 and 100 Mbps plans, with reduced installation.',
    desktopImageUrl: '/tv-bundle.png',
    mobileImageUrl: '/tv-bundle.png',
    imageAlt: 'Promotional artwork for the Monsoon Surge offer',
    primaryCtaLabel: 'View the offer',
    primaryCtaHref: '/offers/monsoon-surge',
    secondaryCtaLabel: 'Get StormFiber',
    secondaryCtaHref: '/get-stormfiber',
    theme: SlideTheme.DARK,
    status: PublishStatus.PUBLISHED,
    displayOrder: 3,
  },
];

export const seedCmsSections = [
  {
    key: 'home.products',
    kind: CmsSectionKind.PRODUCT_TRIO,
    eyebrow: 'One line. Three services.',
    heading: 'Everything your home needs, on a',
    headingAccent: 'single fibre',
    subheading:
      'Internet, television and voice share the same fibre into your home, so there is one installation, one bill and one number to call.',
    status: PublishStatus.PUBLISHED,
    displayOrder: 1,
    content: {},
  },
  {
    key: 'home.benefits',
    kind: CmsSectionKind.BENEFITS,
    eyebrow: 'Why fibre matters',
    heading: 'Built differently, so it',
    headingAccent: 'behaves differently',
    subheading:
      'Most providers stop the fibre at a street cabinet and use copper or coaxial for the last stretch. We do not, and that single decision explains almost every difference you will notice.',
    status: PublishStatus.PUBLISHED,
    displayOrder: 2,
    content: {
      items: [
        {
          title: 'Symmetric speeds',
          description:
            'Your upload matches your download on every plan, because fibre has no reason to favour one direction.',
          iconKey: 'arrow-up-down',
        },
        {
          title: 'Steady at peak hours',
          description:
            'A dedicated fibre path to your home means your 9pm speed looks like your 9am speed.',
          iconKey: 'activity',
        },
        {
          title: 'Unlimited usage',
          description:
            'No volume cap and no download limit, with a fair-usage policy that keeps the segment healthy.',
          iconKey: 'infinity',
        },
        {
          title: 'Three services, one bill',
          description:
            'Internet, television and voice arrive together and are invoiced together, itemised line by line.',
          iconKey: 'layers',
        },
        {
          title: 'Support that answers',
          description: 'A 24/7 helpline in every city we serve, plus ticketing from your portal.',
          iconKey: 'headset',
        },
        {
          title: 'Transparent pricing',
          description:
            'Every price you see includes the tax breakdown for your city, calculated before you commit.',
          iconKey: 'receipt',
        },
      ],
    },
  },
  {
    key: 'home.plans',
    kind: CmsSectionKind.FEATURED_PLANS,
    eyebrow: 'Plans',
    heading: 'Plans that value your',
    headingAccent: 'needs',
    subheading:
      'Pick your city to see the exact pricing that applies there, including installation and taxes.',
    ctaLabel: 'See all plans',
    ctaHref: '/plans',
    status: PublishStatus.PUBLISHED,
    displayOrder: 3,
    content: {},
  },
  {
    key: 'home.promotions',
    kind: CmsSectionKind.PROMOTIONS,
    eyebrow: 'Offers',
    heading: 'Running',
    headingAccent: 'right now',
    subheading: 'Seasonal pricing and switching credits, with the terms stated up front.',
    ctaLabel: 'All offers',
    ctaHref: '/offers',
    status: PublishStatus.PUBLISHED,
    displayOrder: 4,
    content: {},
  },
  {
    key: 'home.coverage',
    kind: CmsSectionKind.COVERAGE,
    eyebrow: 'Coverage',
    heading: 'Find our fibre',
    headingAccent: 'near you',
    subheading:
      'We build neighbourhood by neighbourhood. Check your area rather than your city — the answer is often different.',
    ctaLabel: 'Check availability',
    ctaHref: '/check-availability',
    status: PublishStatus.PUBLISHED,
    displayOrder: 5,
    content: {},
  },
  {
    key: 'home.faq',
    kind: CmsSectionKind.FAQ,
    eyebrow: 'Questions',
    heading: 'The things people ask',
    headingAccent: 'most',
    subheading: 'Short answers to the questions that come up before signing up.',
    ctaLabel: 'Visit the help centre',
    ctaHref: '/support/help-center',
    status: PublishStatus.PUBLISHED,
    displayOrder: 6,
    content: { faqSlugs: ['how-to-check-availability', 'how-and-when-will-i-be-billed', 'what-is-a-triple-play-plan', 'what-is-the-fair-usage-policy', 'how-long-does-installation-take'] },
  },
  {
    key: 'home.cta',
    kind: CmsSectionKind.CTA,
    eyebrow: null,
    heading: 'All set to storm into the',
    headingAccent: 'future?',
    subheading:
      'Check your area, pick a plan and we will handle the rest. Installation is usually scheduled within a few days of approval.',
    ctaLabel: 'Get StormFiber',
    ctaHref: '/get-stormfiber',
    status: PublishStatus.PUBLISHED,
    displayOrder: 7,
    content: {},
  },
  {
    key: 'support.payment-methods',
    kind: CmsSectionKind.PAYMENT_METHODS,
    eyebrow: 'Billing',
    heading: 'Diverse options to pay your',
    headingAccent: 'bills',
    subheading: 'Freedom to pay the way you want, with confirmation you can rely on.',
    status: PublishStatus.PUBLISHED,
    displayOrder: 1,
    content: {
      methods: [
        {
          title: 'Card payment in your portal',
          description:
            'Pay with a debit or credit card through the gateway in your portal. The payment is only marked successful after our server verifies it with the provider.',
          iconKey: 'credit-card',
          steps: [
            'Sign in to your portal',
            'Open the invoice you want to settle',
            'Choose Pay now and select card',
            'Complete the payment on the provider page',
            'Your invoice and balance update once verification completes',
          ],
        },
        {
          title: 'Bank transfer',
          description:
            'Transfer from your bank using your account number as the reference. Transfers are reconciled against your invoice automatically.',
          iconKey: 'landmark',
        },
        {
          title: 'Mobile wallet',
          description:
            'Pay from a supported mobile wallet. The wallet confirms the transaction back to us and your invoice updates.',
          iconKey: 'smartphone',
        },
        {
          title: 'Cash at a branch',
          description:
            'Pay in cash at any of our city branches. The receipt is recorded against your account the same day.',
          iconKey: 'store',
        },
      ],
      incentives: [
        {
          title: 'Advance payment discount',
          description:
            'Settle several months in advance and a discount is applied to the invoices covered.',
        },
        {
          title: 'Paperless by default',
          description:
            'Every invoice and tax certificate is available to download from your portal.',
        },
      ],
    },
  },
];

export const seedCmsPages = [
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    excerpt: 'The terms that govern your use of StormFiber services.',
    status: PublishStatus.PUBLISHED,
    seoTitle: 'Terms and Conditions',
    seoDescription: 'The terms and conditions governing StormFiber internet, television and voice services.',
    body: `## 1. Scope

These terms govern the supply of internet, television and voice services by StormFiber ("we", "us")
to you ("the customer"). By submitting an application or using the services you accept these terms.

## 2. Service provision

2.1 Services are supplied only where our fibre network reaches the premises. Availability is
confirmed through our coverage system before an application is approved.

2.2 Advertised speeds are the maximum capacity provisioned on your line. Actual throughput within
your home also depends on your equipment, wiring and Wi-Fi environment.

2.3 We may carry out planned maintenance that briefly interrupts service. Where practicable we
notify affected customers in advance.

## 3. Equipment

3.1 The optical terminal, router and any set-top boxes remain our property for the duration of the
service and must be returned on termination.

3.2 Faults arising from normal use are repaired or replaced at no charge. Physical damage, liquid
damage, tampering, and loss are chargeable at the prevailing replacement rate.

## 4. Charges and billing

4.1 Invoices are generated on the first day of each month and are payable on or before the tenth
day of the same month.

4.2 One-time charges, such as installation, appear on the first invoice unless a promotion states
otherwise.

4.3 All charges are exclusive of applicable taxes, which are itemised on the invoice at the rate
applicable to the city where the service is registered.

4.4 An invoice that remains unpaid after its due date is treated as overdue and the account becomes
eligible for suspension.

## 5. Fair usage

Residential internet plans are supplied without a volume cap. A fair-usage policy applies,
consistent with the rules and regulations of the telecommunications regulator, to ensure that no
single connection degrades service quality for others on the same network segment.

## 6. Plan changes

6.1 An upgrade may be requested at any time and normally takes effect from the next billing cycle.

6.2 A downgrade from a promotional plan may be requested once the promotional period has ended.

6.3 Every change is recorded against your subscription and is visible to you in your portal.

## 7. Privacy and legal compliance

7.1 We process personal data only as necessary to provide, bill and support the services, and in
accordance with our privacy policy.

7.2 We may disclose account information where we are required or permitted to do so by law, and we
cooperate with regulators and law-enforcement authorities in the investigation of criminal or civil
matters. Any such cooperation is limited to what applicable law requires.

7.3 You must use the services in accordance with applicable law. We are not responsible for misuse
of the services by you or by anyone using your connection.

## 8. Suspension and termination

8.1 We may suspend the services for non-payment, for breach of these terms, or where required by
law or by the regulator.

8.2 Either party may terminate the services by giving notice. Charges accrued up to the date of
termination remain payable.

## 9. Limitation of liability

Our liability in connection with the services is limited to the charges paid for the affected
service in the billing period in which the issue arose. We are not liable for indirect or
consequential loss.

## 10. Changes to these terms

We may amend these terms. Material changes are published on this page and, where they affect your
charges or rights, notified to you directly.`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    excerpt: 'What personal data we collect, why we collect it and how we protect it.',
    status: PublishStatus.PUBLISHED,
    seoTitle: 'Privacy Policy',
    seoDescription: 'How StormFiber collects, uses, stores and protects your personal information.',
    body: `## What we collect

To supply and bill the services we collect your name, contact details, service address, the last
four digits of your identity document where verification is required, and records of your
subscription, invoices, payments and support interactions.

## What we do not collect

We do not store full payment card numbers, card verification values, or any raw payment
credentials. Card payments are handled by our payment provider, and we retain only a masked
descriptor such as the card scheme and last four digits, together with the provider's transaction
reference.

## How we use it

We use your data to provision and support your service, to invoice you, to notify you about your
account, and to understand where to extend our network next. Coverage enquiries are recorded so we
can prioritise construction and contact you when your area goes live.

## Analytics

We record aggregate product analytics such as page views, coverage checks and plan comparisons.
Visitor addresses are truncated to a network prefix before storage, so these records cannot be tied
back to an individual visitor.

## Security

Passwords are stored only as salted hashes. One-time codes are stored hashed and expire within
minutes. Access to customer records inside our organisation is controlled by role, and every
privileged action is written to an audit log.

## Retention

Account, billing and tax records are retained for as long as required by law. Coverage enquiries
and analytics records are retained for a limited period and then aggregated or deleted.

## Your choices

You can review and correct your profile from your portal, request a copy of your account data, and
opt out of marketing messages while continuing to receive essential service and billing
notifications.

## Legal disclosure

We may disclose account information where required or permitted by law, including in response to a
lawful order, and we cooperate with regulators and law-enforcement authorities to the extent
applicable law requires.`,
  },
  {
    slug: 'fair-usage-policy',
    title: 'Fair Usage Policy',
    excerpt: 'How we keep unlimited plans genuinely usable for everyone on the network.',
    status: PublishStatus.PUBLISHED,
    seoTitle: 'Fair Usage Policy',
    seoDescription:
      'Our fair usage policy for unlimited residential fibre plans, applied in line with regulatory requirements.',
    body: `## Why this policy exists

Residential internet plans are sold with no volume cap and no download limit. A very small number of
connections can nonetheless generate sustained load that degrades service for neighbours sharing the
same network segment. This policy describes how we handle that, and it is applied consistently with
the rules and regulations of the telecommunications regulator.

## What normal use looks like

Streaming, gaming, video calls, cloud backups, working from home and large downloads are all normal
use, on every plan, at any time of day. Nothing in this policy is intended to discourage them.

## What we look at

We monitor aggregate segment health, not the content of your traffic. Where a segment shows
sustained congestion we identify the connections contributing disproportionately over an extended
period.

## What happens then

Our first step is always to contact you and discuss the pattern — usually the cause is a
misconfigured device or a compromised machine on the local network. Where the pattern continues, we
may temporarily shape the connection during peak hours, or recommend a plan better matched to the
usage. We do not terminate service for heavy use without prior contact.

## Business use

Residential plans are provisioned for household use. If you are running services that need
guaranteed capacity, a static address or an availability commitment, a business product is the
correct fit and we will help you move to one.`,
  },
  {
    slug: 'about',
    title: 'About Majawar X Network',
    excerpt: 'Fibre for Lahore homes — one line, one bill, one helpline.',
    status: PublishStatus.PUBLISHED,
    seoTitle: 'About Majawar X Network',
    seoDescription: 'Who we are, where we operate, and how to reach Majawar X Network in Lahore.',
    body: `Majawar X Network is a fibre internet provider based in Lahore. We connect homes that need a stable line for school, work, and evening television — without asking the household to juggle three different vendors.

Our mission is a serviceable, documented fibre drop, a bill that matches the plan on the card, and a helpline that answers in Pakistan Standard Time.

Edit this page in the admin CMS whenever the company story changes.`,
  },
];

export const seedSiteSettings = {
  brandName: 'StormFiber',
  supportPhone: '111-1-78676',
  supportEmail: 'help@stormfiber.local',
  announcement: {
    message: 'Monsoon Surge is live — 20% off your first three months on selected plans.',
    href: '/offers/monsoon-surge',
  },
  socialLinks: [
    { platform: 'whatsapp', url: 'https://wa.me/923030002291' },
    { platform: 'instagram', url: 'https://www.instagram.com/majawar_x_network?igsi=bDVhMmF1bmpkOGdo' },
    { platform: 'linkedin', url: 'https://www.linkedin.com/company/majawar-x-networks/' },
  ],
  footerColumns: [
    {
      title: 'Products',
      links: [
        { label: 'Ultra-Fast Internet', href: '/products/internet', external: false },
        { label: 'HD TV', href: '/products/tv', external: false },
        { label: 'Crystal Clear Voice', href: '/products/phone', external: false },
        { label: 'All plans', href: '/plans', external: false },
        { label: 'Offers', href: '/offers', external: false },
      ],
    },
    {
      title: 'Get connected',
      links: [
        { label: 'Check availability', href: '/check-availability', external: false },
        { label: 'Get StormFiber', href: '/get-stormfiber', external: false },
        { label: 'Coverage map', href: '/coverage', external: false },
        { label: 'Compare plans', href: '/plans/compare', external: false },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help centre', href: '/support/help-center', external: false },
        { label: 'Billing & payments', href: '/support/billing', external: false },
        { label: 'Get in touch', href: '/support/contact', external: false },
        { label: 'FAQs', href: '/faqs', external: false },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms and conditions', href: '/terms-and-conditions', external: false },
        { label: 'Privacy policy', href: '/privacy-policy', external: false },
        { label: 'Fair usage policy', href: '/fair-usage-policy', external: false },
      ],
    },
  ],
  footerNote:
    'StormFiber is a demonstration platform built as an original implementation. Plans, pricing and coverage shown here are development data.',
};
