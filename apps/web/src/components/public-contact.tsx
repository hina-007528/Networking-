import { brand } from '@stormfiber/config';
import { SocialLinks } from './social-links';

interface PublicContactProps {
  className?: string;
  tone?: 'light' | 'dark';
}

export function PublicContact({ className = '', tone = 'light' }: PublicContactProps) {
  const card =
    tone === 'dark'
      ? 'rounded-xl border border-white/10 bg-white/5 p-4'
      : 'rounded-xl border border-[#E6EEF6] bg-[#F8FBFF] p-4';
  const label = tone === 'dark' ? 'text-[#7FD1F0]' : 'text-[#2E86DE]';
  const value = tone === 'dark' ? 'text-white/80 hover:text-white' : 'text-[#0C2340] hover:text-[#145DA0]';

  const phones = [
    { label: 'Phone', href: `tel:${brand.supportPhoneE164}`, value: brand.supportPhoneDisplay },
    { label: 'WhatsApp', href: brand.whatsappUrl, value: brand.whatsappDisplay },
  ];
  const emails = [
    { label: 'Email', href: `mailto:${brand.supportEmail}`, value: brand.supportEmail },
  ];

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        {phones.map((item) => (
          <article key={item.label} className={card}>
            <p className={`text-xs font-bold uppercase tracking-wider ${label}`}>{item.label}</p>
            <a
              className={`mt-2 block text-sm font-semibold break-all ${value}`}
              href={item.href}
              {...(item.label === 'WhatsApp' ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {item.value}
            </a>
          </article>
        ))}
        {emails.map((item) => (
          <article key={item.label} className={card}>
            <p className={`text-xs font-bold uppercase tracking-wider ${label}`}>{item.label}</p>
            <a className={`mt-2 block text-sm font-semibold break-all ${value}`} href={item.href}>
              {item.value}
            </a>
          </article>
        ))}
      </div>
      <SocialLinks tone={tone} className="mt-4" />
    </div>
  );
}
