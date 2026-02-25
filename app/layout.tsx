import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'OMEN — Corporate Accountability Intelligence',
    template: '%s — OMEN',
  },
  description:
    'A permanent public record of corporate conduct, maintained by OMARO Public Benefit Corporation.',
};

const NAV_LINKS = [
  { href: '/ledger', label: 'LEDGER >' },
  { href: '/dashboard', label: 'DASHBOARD >' },
  { href: '/oca', label: 'OCA >' },
  { href: '/about', label: 'ABOUT >' },
  { href: '/api', label: 'API >' },
  { href: '/legal-battles', label: 'LEGAL >' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body>
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>

        <header
          style={{
            borderBottom: '1px solid var(--omen-border)',
            padding: '1rem 0',
          }}
        >
          <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.1em', textDecoration: 'none' }}
              aria-label="OMEN — Home"
            >
              OMEN
            </Link>
            <nav aria-label="Primary navigation">
              <ul
                role="list"
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  flexWrap: 'wrap',
                }}
              >
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{ fontSize: '0.875rem', opacity: 0.8, textDecoration: 'none', letterSpacing: '0.05em' }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main id="main-content" style={{ minHeight: 'calc(100vh - 8rem)' }}>
          {children}
        </main>

        <footer
          style={{
            borderTop: '1px solid var(--omen-border)',
            padding: '1.5rem 0',
            marginTop: '4rem',
            fontSize: '0.8rem',
            color: 'var(--omen-muted)',
          }}
        >
          <div className="container">
            <p style={{ margin: 0 }}>
              OMARO Public Benefit Corporation. The record stands.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
