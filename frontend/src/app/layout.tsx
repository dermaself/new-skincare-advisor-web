import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import './globals.css';
import { CartProvider } from '../components/CartContext';
import LogoViolet from './RGB_Logo_Violet.avif';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dermaself - AI Skin Analysis',
  description: 'Advanced AI-powered skin analysis and personalized product recommendations',
  keywords: 'skin analysis, AI, skincare, beauty, dermatology, personalized recommendations',
  authors: [{ name: 'Dermaself Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Dermaself - AI Skin Analysis',
    description: 'Advanced AI-powered skin analysis and personalized product recommendations',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dermaself - AI Skin Analysis',
    description: 'Advanced AI-powered skin analysis and personalized product recommendations',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <CartProvider>
          <header className="bg-[#e9d5ff] border-b border-purple-200/70">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center">
              <Image src={LogoViolet} alt="Dermaself" className="h-8 w-auto" priority />
              <span className="sr-only">Dermaself</span>
            </div>
          </header>
          <div className="min-h-screen">
            {children}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
