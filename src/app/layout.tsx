import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VibePair | Private Couples 3D Sanctuary & Encrypted Space',
  description:
    'An end-to-end encrypted private couples sanctuary with 3D avatar studio, shared multiplayer sandbox world, voice/video calls with voice effects, and relationship AI.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VibePair',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0713',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#07040d] text-slate-100 overflow-x-hidden selection:bg-pink-500 selection:text-white touch-manipulation">
        {children}
      </body>
    </html>
  );
}
