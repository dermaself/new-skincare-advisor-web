import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DermaSelf - AI Skin Analysis',
  description: 'Advanced AI-powered skin analysis and personalized product recommendations',
  keywords: 'skin analysis, AI, skincare, beauty, dermatology, personalized recommendations',
  authors: [{ name: 'DermaSelf Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'DermaSelf - AI Skin Analysis',
    description: 'Advanced AI-powered skin analysis and personalized product recommendations',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DermaSelf - AI Skin Analysis',
    description: 'Advanced AI-powered skin analysis and personalized product recommendations',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {children}
        </div>
      </body>
    </html>
  );
}
