'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8" dir="rtl">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-[#475569] hover:text-[#1E3A8A]">
        → חזרה
      </button>
      <h1 className="text-3xl font-bold text-[#0F172A]">מדיניות פרטיות</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#0F172A]">1. מי אחראי על המידע</h2>
        <p className="text-[#475569]">
          מלון מרכז תל אביב (להלן: &quot;המלון&quot;) אחראי לעיבוד המידע האישי שנמסר במסגרת שירותי ההזמנה ושהות האורחים.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#0F172A]">2. איזה מידע נאסף</h2>
        <ul className="list-disc list-inside text-[#475569] space-y-1">
          <li>שם מלא, כתובת אימייל, מספר טלפון</li>
          <li>מספר דרכון / תעודת זהות (לצ&apos;ק-אין)</li>
          <li>פרטי הזמנה: תאריכים, סוג חדר, מחיר</li>
          <li>פרטי תשלום (מועברים ישירות לספק העיבוד — לא נשמרים במלון)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#0F172A]">3. מטרות העיבוד</h2>
        <ul className="list-disc list-inside text-[#475569] space-y-1">
          <li>ניהול ואישור הזמנות</li>
          <li>צ&apos;ק-אין וצ&apos;ק-אאוט</li>
          <li>הנפקת חשבוניות ועיבוד תשלומים</li>
          <li>שירות לקוחות ותקשורת הקשורה לשהות</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#0F172A]">4. שמירת המידע</h2>
        <p className="text-[#475569]">
          פרטי אורחים נשמרים 7 שנים בהתאם לדרישות חוק רשויות מיסים. יומני ביקורת — 3 שנים. משוב אורחים — שנתיים.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#0F172A]">5. זכויות הגולש</h2>
        <p className="text-[#475569]">
          בהתאם לחוק הגנת הפרטיות (תיקון 13), יש לך זכות לעיין במידע, לתקן אותו, ולבקש את מחיקתו.
          לפנייה: <a href="mailto:privacy@hotel.co.il" className="text-[#1E3A8A] underline">privacy@hotel.co.il</a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#0F172A]">6. העברת מידע לצדדים שלישיים</h2>
        <p className="text-[#475569]">
          המידע עשוי להיות מועבר לספקי שירות (עיבוד תשלומים, שליחת אימיילים, AI) רק לצורך מתן השירות, תוך חתימה על הסכמי עיבוד נתונים בהתאם לחוק.
        </p>
      </section>
    </div>
  );
}
