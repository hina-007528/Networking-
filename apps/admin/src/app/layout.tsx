import type { Metadata } from 'next';
import { brand } from '@stormfiber/config';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${brand.name} Admin`, template: `%s · ${brand.name} Admin` },
  robots: { index: false, follow: false },
  icons: { icon: '/brand/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

