import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
import InstallPrompt from './components/InstallPrompt';
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
  { href: '/ledger', label: '[ ledger ]' },
  { href: '/dashboard', label: '[ dashboard ]' },
  { href: '/contribute', label: '[ contribute ]' },
  { href: '/dashboard/earnings', label: '[ earnings ]' },
  { href: '/oca', label: '[ oca ]' },
  { href: '/about', label: '[ about ]' },
  { href: '/api', label: '[ api ]' },
  { href: '/legal-battles', label: '[ legal ]' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="OMEN" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('OMEN SW registered');
                    })
                    .catch(function(err) {
                      console.log('SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>

        <header
          style={{
            borderBottom: '1px solid var(--omen-border)',
            padding: '1rem 0',
            background: 'var(--omen-sidebar)',
            flexShrink: 0,
          }}
        >
          <div
            className="container"
            style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none',
                flexShrink: 0,
              }}
              aria-label="OMEN — Home"
            >
              <img src="/omen_logo.svg" alt="" width="52" height="52" style={{ display: 'block' }} />
              <span style={{
                fontWeight: 400,
                fontSize: '0.8rem',
                letterSpacing: '0.2em',
                color: 'var(--omen-accent)',
              }}>OMEN</span>
            </Link>
            <nav aria-label="Primary navigation">
              <ul
                role="list"
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  flexWrap: 'nowrap',
                }}
              >
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.6)',
                        textDecoration: 'none',
                        letterSpacing: '0',
                        whiteSpace: 'nowrap',
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
          <main id="main-content" className="main-content">
            {children}
          </main>
          <Sidebar />
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

        <InstallPrompt />
      </body>
    </html>
  );
}
