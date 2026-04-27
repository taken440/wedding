import type { Metadata } from 'next';
import './globals.css';

const bride = process.env.NEXT_PUBLIC_BRIDE_NAME ?? 'Mia';
const groom = process.env.NEXT_PUBLIC_GROOM_NAME ?? 'Jonas';

export const metadata: Metadata = {
  title: `${bride} & ${groom} — Vestuvių Nuotraukos`,
  description: `Dalinkitės savo vestuvių nuotraukomis ir vaizdo įrašais su ${bride} ir ${groom}.`,
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: `${bride} & ${groom} — Vestuvių Galerija`,
    description: 'Įkelkite savo nuotraukas ir vaizdo įrašus iš mūsų ypatingos dienos.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
