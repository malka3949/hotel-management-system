'use client';

export default function ExpiredPage() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-6">⏰</div>
      <h1 className="text-2xl font-bold text-primary mb-3">הקישור פג תוקף</h1>
      <p className="text-secondary text-sm">
        קישור הפורטל אינו בתוקף או שכבר נעשה בו שימוש.
        <br />
        לקבלת קישור חדש, פנה לצוות המלון.
      </p>
    </div>
  );
}
