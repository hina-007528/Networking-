/**
 * Help-centre content.
 *
 * The questions mirror the topics a real FTTH operator gets asked — billing dates, upgrades,
 * fair usage, installation timelines, self-troubleshooting — and the answers describe *our*
 * implemented behaviour, so the site never documents a feature that does not exist.
 */

export const seedFaqCategories = [
  {
    name: 'About StormFiber',
    slug: 'about',
    description: 'Who we are, what we sell and where we operate.',
    iconKey: 'info',
    displayOrder: 1,
  },
  {
    name: 'Getting Connected',
    slug: 'getting-connected',
    description: 'Coverage, applications, installation and activation.',
    iconKey: 'plug',
    displayOrder: 2,
  },
  {
    name: 'Billing',
    slug: 'billing',
    description: 'Invoices, payment methods, due dates and tax certificates.',
    iconKey: 'receipt',
    displayOrder: 3,
  },
  {
    name: 'Products & Services',
    slug: 'products-services',
    description: 'Internet, television, voice, bundles and add-ons.',
    iconKey: 'boxes',
    displayOrder: 4,
  },
  {
    name: 'Policies',
    slug: 'policies',
    description: 'Fair usage, upgrades and downgrades, equipment and warranty.',
    iconKey: 'scale',
    displayOrder: 5,
  },
  {
    name: 'Self-Troubleshooting',
    slug: 'self-troubleshooting',
    description: 'Fix the common problems yourself before raising a ticket.',
    iconKey: 'wrench',
    displayOrder: 6,
  },
];

export const seedFaqs = [
  {
    categorySlug: 'about',
    question: 'What is StormFiber?',
    slug: 'what-is-stormfiber',
    answer:
      'StormFiber is a fibre-to-the-home provider delivering internet, high-definition television and voice over a single 100% fibre-optic line. Because the fibre runs all the way to your wall socket rather than stopping at a street cabinet, upload speeds match download speeds and performance stays consistent at peak hours.',
    tags: ['about', 'network'],
    displayOrder: 1,
  },
  {
    categorySlug: 'about',
    question: 'In which cities is StormFiber available?',
    slug: 'which-cities-is-stormfiber-available-in',
    answer:
      'We operate in more than twenty cities across Pakistan. Coverage is built neighbourhood by neighbourhood, so a city being live does not mean every area within it is served yet. Use the availability checker to confirm your specific area — it reads the live coverage map rather than a city-level assumption.',
    tags: ['coverage', 'cities'],
    displayOrder: 2,
  },
  {
    categorySlug: 'about',
    question: 'What speeds do you offer?',
    slug: 'what-speeds-do-you-offer',
    answer:
      'Residential plans run from 20 Mbps to 275 Mbps, and every tier is symmetric: the upload speed equals the download speed. Available speeds can differ slightly by area depending on the capacity installed there.',
    tags: ['speed', 'plans'],
    displayOrder: 3,
  },
  {
    categorySlug: 'getting-connected',
    question: 'How do I check whether StormFiber is available at my address?',
    slug: 'how-to-check-availability',
    answer:
      'Open the availability checker, choose your city, then your area and sub-area. We resolve your selection against our coverage map and return one of three results: available, coming soon with an expected live date, or not available yet. In the last two cases you can leave your details and we will contact you as soon as the position changes.',
    tags: ['coverage', 'availability'],
    displayOrder: 1,
  },
  {
    categorySlug: 'getting-connected',
    question: 'How do I apply for a new connection?',
    slug: 'how-to-apply-for-a-new-connection',
    answer:
      'Use the Get StormFiber form. You enter your name and contact details, verify your mobile number with a one-time code, confirm your location, pick your services, plan and any add-ons, and review a full price breakdown before you accept the terms and submit. You receive an application reference immediately and can track its progress from your portal.',
    tags: ['application', 'signup'],
    displayOrder: 2,
  },
  {
    categorySlug: 'getting-connected',
    question: 'How long does installation take?',
    slug: 'how-long-does-installation-take',
    answer:
      'Once your application is approved and the initial charges are settled, we schedule installation and confirm the appointment window with you. The visit itself normally takes two to three hours: we run the fibre drop, terminate it at your chosen location, install the router and any set-top boxes, and verify the service before leaving.',
    tags: ['installation'],
    displayOrder: 3,
  },
  {
    categorySlug: 'getting-connected',
    question: 'What does installation cost?',
    slug: 'what-does-installation-cost',
    answer:
      'The one-time installation charge is shown on every plan and in the price breakdown before you submit an application. Promotional plans sometimes reduce or waive it entirely. The exact amount can vary by city, which is why the figure you see is always the one calculated for the city you selected.',
    tags: ['installation', 'pricing'],
    displayOrder: 4,
  },
  {
    categorySlug: 'billing',
    question: 'How and when will I be billed?',
    slug: 'how-and-when-will-i-be-billed',
    answer:
      'Your first invoice is generated as soon as your account is created and your services are selected. From the following month, invoices are generated on the 1st and are payable on or before the 10th of the same month. Every invoice is available to view and download as a PDF from your portal.',
    tags: ['invoice', 'billing-cycle'],
    displayOrder: 1,
  },
  {
    categorySlug: 'billing',
    question: 'What payment options do I have?',
    slug: 'what-payment-options-do-i-have',
    answer:
      'You can pay by debit or credit card through the payment gateway in your portal, by bank transfer, through a supported mobile wallet, or in cash at one of our branches. Card payments are confirmed by our server after the provider verifies them — we never mark an invoice paid based only on the browser returning to our site.',
    tags: ['payment'],
    displayOrder: 2,
  },
  {
    categorySlug: 'billing',
    question: 'Will I receive a paper bill?',
    slug: 'will-i-receive-a-paper-bill',
    answer:
      'No. Billing is paperless. Every invoice is published to your portal, where you can view the line-by-line breakdown and download a PDF, and you receive an email notification each time a new invoice is generated.',
    tags: ['invoice', 'paperless'],
    displayOrder: 3,
  },
  {
    categorySlug: 'billing',
    question: 'What happens if I pay after the due date?',
    slug: 'what-happens-if-i-pay-late',
    answer:
      'An unpaid invoice is marked overdue after its due date and you receive a reminder. If it remains unpaid, the account becomes eligible for suspension. Clearing the outstanding balance restores service — reactivation is handled from the same billing screen.',
    tags: ['overdue', 'suspension'],
    displayOrder: 4,
  },
  {
    categorySlug: 'billing',
    question: 'Can I see a breakdown of taxes on my invoice?',
    slug: 'tax-breakdown-on-invoice',
    answer:
      'Yes. Each invoice lists the subscription and add-on charges, any promotional discount, and each applicable tax as its own line with the rate that was applied. Tax rates depend on the city your service is registered in, so two customers on the same plan in different cities can see different totals.',
    tags: ['tax', 'invoice'],
    displayOrder: 5,
  },
  {
    categorySlug: 'products-services',
    question: 'What is a Triple Play plan?',
    slug: 'what-is-a-triple-play-plan',
    answer:
      'A Triple Play plan bundles internet, high-definition television and a voice line onto one fibre connection, billed on a single invoice. Because all three services share the same fibre, there is only one installation and one monthly charge.',
    tags: ['triple-play', 'bundles'],
    displayOrder: 1,
  },
  {
    categorySlug: 'products-services',
    question: 'What is a Double Play plan?',
    slug: 'what-is-a-double-play-plan',
    answer:
      'A Double Play plan combines fibre internet with a voice line, without television. It suits households that want a reliable landline but watch their content over the internet.',
    tags: ['double-play', 'bundles'],
    displayOrder: 2,
  },
  {
    categorySlug: 'products-services',
    question: 'Can I add TV to an internet-only account?',
    slug: 'can-i-add-tv-to-an-internet-account',
    answer:
      'Yes. Open your subscription in the portal and request the additional service. The request is reviewed, priced against your city, and applied from the effective date shown on the confirmation. Applicable charges appear on your next invoice.',
    tags: ['upgrade', 'tv'],
    displayOrder: 3,
  },
  {
    categorySlug: 'products-services',
    question: 'What does the HD box do?',
    slug: 'what-does-the-hd-box-do',
    answer:
      'The set-top box decodes the television service and drives the on-screen experience: the seven-day programming guide, instant channel changes and category browsing. One box serves one television; you can add more boxes as an add-on.',
    tags: ['tv', 'hardware'],
    displayOrder: 4,
  },
  {
    categorySlug: 'policies',
    question: 'What is the fair usage policy?',
    slug: 'what-is-the-fair-usage-policy',
    answer:
      'Residential internet plans are sold without a volume cap or download limit. A fair-usage policy applies, consistent with the rules and regulations of the telecommunications regulator, so that no single connection can degrade service for its neighbours on the same segment.',
    tags: ['fair-usage', 'policy'],
    displayOrder: 1,
  },
  {
    categorySlug: 'policies',
    question: 'When can I upgrade or downgrade my plan?',
    slug: 'when-can-i-upgrade-or-downgrade',
    answer:
      'You can request an upgrade at any time and it normally takes effect from your next billing cycle. If you are on a promotional plan, a downgrade can be requested once the promotional period has ended. Every change is recorded against your subscription history, so you can always see what changed and when.',
    tags: ['upgrade', 'downgrade'],
    displayOrder: 2,
  },
  {
    categorySlug: 'policies',
    question: 'Is the equipment covered by a warranty?',
    slug: 'is-equipment-covered-by-warranty',
    answer:
      'The optical terminal and set-top boxes remain our property and are covered for faults for as long as the service is active. Physical damage, liquid damage and tampering are not covered, and a replacement charge applies in those cases.',
    tags: ['warranty', 'hardware'],
    displayOrder: 3,
  },
  {
    categorySlug: 'policies',
    question: 'Do you offer TV or phone without internet?',
    slug: 'tv-or-phone-without-internet',
    answer:
      'Yes. We publish a stand-alone television plan and a stand-alone voice plan. Both still require a fibre installation to your premises, because both services are carried over the same fibre.',
    tags: ['tv', 'phone', 'standalone'],
    displayOrder: 4,
  },
  {
    categorySlug: 'self-troubleshooting',
    question: 'My internet is down. What should I check first?',
    slug: 'internet-is-down-what-to-check',
    answer:
      'Check the optical terminal first. A steady power light with a steady optical light means the fibre link is healthy and the problem is likely inside your home network — restart the router and retest with a cable. A red or flashing optical light means the fibre link itself is down, which we need to investigate; raise a ticket and include the light pattern you can see.',
    tags: ['troubleshooting', 'internet'],
    displayOrder: 1,
  },
  {
    categorySlug: 'self-troubleshooting',
    question: 'My Wi-Fi is slow in some rooms but fine near the router.',
    slug: 'wifi-slow-in-some-rooms',
    answer:
      'That pattern points to Wi-Fi coverage rather than your fibre line. Run a speed test with a device connected by cable: if the wired result matches your plan, the line is fine. Moving the router away from walls and metal, or adding a mesh node, resolves most coverage problems.',
    tags: ['troubleshooting', 'wifi'],
    displayOrder: 2,
  },
  {
    categorySlug: 'self-troubleshooting',
    question: 'A television channel is missing or shows an error.',
    slug: 'tv-channel-missing',
    answer:
      'Restart the set-top box and let it complete its channel refresh. If the channel is still missing, confirm it is included in your package on the subscription screen in your portal. If it is included and still unavailable, raise a ticket with the channel number.',
    tags: ['troubleshooting', 'tv'],
    displayOrder: 3,
  },
  {
    categorySlug: 'self-troubleshooting',
    question: 'My landline has no dial tone.',
    slug: 'landline-has-no-dial-tone',
    answer:
      'Check that the handset cable is seated in the voice port on the optical terminal, and try a second handset to rule out the phone itself. If the terminal shows a healthy optical light but there is still no dial tone on either handset, raise a ticket and we will check the voice provisioning on your line.',
    tags: ['troubleshooting', 'phone'],
    displayOrder: 4,
  },
];

export const seedSupportCategories = [
  {
    name: 'Internet',
    slug: 'internet',
    description: 'Speed, connectivity, Wi-Fi and outages.',
    iconKey: 'wifi',
    displayOrder: 1,
  },
  {
    name: 'Television',
    slug: 'television',
    description: 'Channels, set-top box and picture quality.',
    iconKey: 'tv',
    displayOrder: 2,
  },
  {
    name: 'Voice',
    slug: 'voice',
    description: 'Dial tone, call quality and voice bundles.',
    iconKey: 'phone',
    displayOrder: 3,
  },
  {
    name: 'Billing & Payments',
    slug: 'billing',
    description: 'Invoices, payments, refunds and tax certificates.',
    iconKey: 'receipt',
    displayOrder: 4,
  },
  {
    name: 'Installation & Relocation',
    slug: 'installation',
    description: 'New installations, moving home and extra points.',
    iconKey: 'truck',
    displayOrder: 5,
  },
  {
    name: 'Account & Plan Changes',
    slug: 'account',
    description: 'Profile details, upgrades, downgrades and suspension.',
    iconKey: 'user-cog',
    displayOrder: 6,
  },
];
