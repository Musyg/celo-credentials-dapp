import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Celo Credentials',
  description: 'Soulbound education credentials with gasless EIP-712 minting on Celo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main>
            <nav>
              <Link href="/">Mint</Link>
              <Link href="/credentials">My credentials</Link>
              <Link href="/verify/1">Verify</Link>
            </nav>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
