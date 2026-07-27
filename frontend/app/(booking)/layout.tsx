import Link from 'next/link';

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]" dir="rtl">
      <header className="bg-white border-b border-[var(--color-border-default)] shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/book" className="text-xl font-bold text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors">
            🏨 רשת מלונות
          </Link>
          <Link
            href="/login"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            כניסה לצוות
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
