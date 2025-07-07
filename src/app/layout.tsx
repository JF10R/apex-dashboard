import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Orbitron, Inter } from 'next/font/google';

const fontHeadline = Orbitron({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-headline',
});

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});


export const metadata: Metadata = {
  title: 'Apex Stats',
  description: 'An iRacing user stats dashboard to look up drivers and visualize their performance progression.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontHeadline.variable} ${fontBody.variable} font-body antialiased min-h-screen bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
