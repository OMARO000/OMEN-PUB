import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
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
  { href: '/contribute', label: 'CONTRIBUTE >' },
  { href: '/dashboard/earnings', label: 'EARNINGS >' },
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
            padding: '0.75rem 0',
            background: 'var(--omen-sidebar)',
            flexShrink: 0,
          }}
        >
          <div
            className="container"
            style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}
          >
            <Link
              href="/"
              style={{
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '0.15em',
                textDecoration: 'none',
                color: 'var(--omen-accent)',
              }}
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
                      style={{
                        fontSize: '0.8rem',
                        opacity: 0.7,
                        textDecoration: 'none',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <div className="app-shell">
          <Sidebar />
          <main id="main-content" className="main-content">
            {children}
          </main>
        </div>

        <footer
          style={{
            borderTop: '1px solid var(--omen-border)',
            padding: '0.6rem 0',
            fontSize: '0.75rem',
            color: 'var(--omen-muted)',
            background: 'var(--omen-sidebar)',
            flexShrink: 0,
          }}
        >
          <div className="container">
            <p style={{ margin: 0 }}>OMARO Public Benefit Corporation. The record stands.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
