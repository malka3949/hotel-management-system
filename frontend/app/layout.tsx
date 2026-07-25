import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'מערכת ניהול מלון',
  description: 'Hotel chain management system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-base text-primary antialiased">
        {children}
        <Toaster position="top-center" dir="rtl" richColors duration={4000} />
      </body>
    </html>
  );
}
