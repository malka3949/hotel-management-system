import Link from 'next/link';

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <header className="bg-white border-b border-[#E2E8F0] shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/book" className="text-xl font-bold text-[#1E3A8A] hover:text-[#3B82F6] transition-colors">
            🏨 רשת מלונות
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#475569] hover:text-[#1E3A8A] transition-colors"
          >
            כניסה לצוות
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
