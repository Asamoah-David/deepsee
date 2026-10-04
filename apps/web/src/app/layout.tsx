import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'DeepSee', template: '%s | DeepSee' },
  description: 'Universal Windows Device Operations Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
