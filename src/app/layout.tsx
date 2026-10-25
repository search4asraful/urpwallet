import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'urpwallet - Your Personal Wallet | Open Source Expense & Money Manager',
  description: 'urpwallet (Your Personal Wallet) — An open-source daily budget tracking, multi-account, and personal money management wallet for everyone.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'urpwallet',
  },
};

export const viewport: Viewport = {
  themeColor: '#090a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('urpwallet_theme') || localStorage.getItem('wallet_theme') || 'system';
                  var resolved = saved;
                  if (saved === 'system') {
                    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    resolved = prefersDark ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                  if (resolved === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-theme-app text-theme-main font-sans`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
