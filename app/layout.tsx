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
  { href: '/financials', label: '[ financials ]' },
  { href: '/dashboard', label: '[ dashboard ]' },
  { href: '/contribute', label: '[ contribute ]' },
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

        <div className="app-shell">
          {/* Left sidebar — logo + nav */}
          <div style={{
            width: '360px',
            flexShrink: 0,
            background: 'var(--omen-sidebar)',
            borderRight: '1px solid var(--omen-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            overflowY: 'auto',
          }}>
            <Link href="/" style={{ textDecoration: 'none' }} aria-label="OMEN — Home">
              <img src="/omen_logo.svg" alt="" width="320" height="320" style={{ display: 'block' }} />
              <span style={{
                display: 'block',
                textAlign: 'center',
                fontWeight: 400,
                fontSize: '1.8rem',
                letterSpacing: '0.2em',
                color: 'var(--omen-accent)',
                marginTop: '-2rem',
              }}>OMEN</span>
            </Link>
            <a
              href="https://omaro.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: '0.6rem',
                letterSpacing: '0.18em',
                color: 'var(--omen-accent)',
                marginTop: '0.4rem',
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--omen-accent)',
                background: 'rgba(76,175,125,0.06)',
                textDecoration: 'none',
              }}
            >AN OMARO COMPANY</a>

            <nav aria-label="Primary navigation" style={{ marginTop: '2rem' }}>
              <ul role="list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                margin: 0,
                padding: 0,
                listStyle: 'none',
              }}>
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} style={{
                      fontSize: '0.9rem',
                      color: 'var(--omen-accent)',
                      textDecoration: 'none',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--omen-accent)',
                      marginBottom: '0.3rem',
                      textAlign: 'center',
                    }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div style={{
              padding: '16px',
              borderTop: '1px solid rgba(76,175,125,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: 'auto',
            }}>
              <a href="/dashboard/login" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#0b0b0c',
                textDecoration: 'none',
                letterSpacing: '0.08em',
                padding: '8px 12px',
                background: 'var(--omen-accent)',
                borderRadius: '4px',
                textAlign: 'center',
                display: 'block',
              }}>
                [ log in ]
              </a>
              <a href="/dashboard/signup" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#0b0b0c',
                textDecoration: 'none',
                letterSpacing: '0.08em',
                padding: '8px 12px',
                background: 'var(--omen-accent)',
                borderRadius: '4px',
                textAlign: 'center',
                display: 'block',
              }}>
                [ create account ]
              </a>
            </div>
          </div>

          {/* Main content */}
          <main id="main-content" className="main-content">
            {children}
          </main>

          {/* Right sidebar — search + filters */}
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
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0 }}>OMARO Public Benefit Corporation. The record stands.</p>
        </footer>

        <InstallPrompt />
      </body>
    </html>
  );
}
