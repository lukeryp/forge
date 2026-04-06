import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FORGE — RYP Performance Index',
  description: 'Four-pillar golf drill scoring system. Track your RYP Performance Index.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
