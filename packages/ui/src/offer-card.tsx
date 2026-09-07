export interface OfferCardProps {
  title: string;
  description: string;
  href: string;
  badge?: string;
}

export function OfferCard({ title, description, href, badge }: OfferCardProps) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-[#e4e9ef] bg-white p-6 shadow-[0_8px_24px_rgb(16_32_51/0.05)] transition-transform hover:-translate-y-0.5"
    >
      {badge ? (
        <span className="inline-flex rounded-sm bg-[#2E86DE] px-2.5 py-0.5 text-xs font-bold text-white">{badge}</span>
      ) : null}
      <h3 className="mt-3 font-display text-xl font-extrabold text-[#1b2430]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5d6b7a]">{description}</p>
    </a>
  );
}
