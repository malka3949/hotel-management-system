export default function DashboardPage() {
  return (
    <div>
      <h2
        className="text-xl font-semibold mb-6"
        style={{ color: 'var(--color-text-primary)' }}
      >
        דשבורד
      </h2>
      <div
        className="rounded-lg border p-6 bg-surface text-center"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Phase 0 — תשתית בלבד. תוכן יתווסף מ-Phase 1 ואילך.
        </p>
      </div>
    </div>
  );
}
