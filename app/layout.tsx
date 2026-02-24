import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'OMEN — Corporate Accountability Intelligence',
    template: '%s — OMEN',
  },
  description:
    'A permanent public record of corporate conduct, maintained by OMARO Public Benefit Corporation.',
};

const NAV_LINKS = [
  { href: '/ledger', label: 'Ledger' },
  { href: '/legal-battles', label: 'Legal Battles' },
  { href: '/oca', label: 'OCA' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/api', label: 'API' },
  { href: '/about', label: 'About' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
                      style={{ fontSize: '0.875rem', opacity: 0.8, textDecoration: 'none' }}
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
